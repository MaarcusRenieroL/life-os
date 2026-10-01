package com.lifeos.finance_tracker.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.BankAlertEventRecord;
import com.lifeos.finance_tracker.domains.dto.request.CreateEmailAlertTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.ReportImportFailureRequest;
import com.lifeos.finance_tracker.domains.dto.response.ImportFailureResponse;
import com.lifeos.finance_tracker.domains.entity.ImportFailure;
import com.lifeos.finance_tracker.domains.enums.AccountType;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.exception.AccountNotFoundException;
import com.lifeos.finance_tracker.exception.InvalidRequestException;
import com.lifeos.finance_tracker.repository.ImportFailureRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The inbox of money that did not make it into the books. A bank alert whose account does not exist
 * yet, or whose format no parser understands, used to be logged and forgotten. Here it is kept:
 * creating the missing account retries what was waiting, and anything else can be retried by hand
 * or dismissed.
 */
@Service
@RequiredArgsConstructor
public class ImportFailureService {

  private static final Logger log = LoggerFactory.getLogger(ImportFailureService.class);
  private static final int SNIPPET_MAX = 600;

  private final ImportFailureRepository repository;
  private final TransactionService transactionService;
  // Jackson 2 on purpose (what the Kafka payloads use); Spring Boot 4's own mapper is Jackson 3.
  private final ObjectMapper objectMapper =
      com.fasterxml.jackson.databind.json.JsonMapper.builder()
          .findAndAddModules()
          .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
          .build();

  /** An alert that parsed fine but had no account to land in. Kept with its payload so it can be replayed. */
  @Transactional
  public void recordNoAccount(BankAlertEventRecord event, String detail) {
    ImportFailure failure = existingOrNew(event.userId(), event.sourceReference());
    failure.setSource("EMAIL_ALERT");
    failure.setReason("NO_ACCOUNT");
    failure.setPayload(toJson(event));
    failure.setDetail(cut(detail, 500));
    failure.setStatus(ImportFailure.OPEN);
    repository.save(failure);
  }

  /** An alert that could not be booked for any other reason. */
  @Transactional
  public void recordError(BankAlertEventRecord event, String detail) {
    ImportFailure failure = existingOrNew(event.userId(), event.sourceReference());
    failure.setSource("EMAIL_ALERT");
    failure.setReason("ERROR");
    failure.setPayload(toJson(event));
    failure.setDetail(cut(detail, 500));
    failure.setStatus(ImportFailure.OPEN);
    repository.save(failure);
  }

  /** An alert email batches could not parse at all (reported over the internal API). */
  @Transactional
  public void recordUnparsed(ReportImportFailureRequest request) {
    ImportFailure failure = existingOrNew(request.getUserId(), request.getReference());
    if (ImportFailure.RESOLVED.equals(failure.getStatus()) || ImportFailure.DISMISSED.equals(failure.getStatus())) {
      return; // the user already dealt with this email; it is re-sent on every poll
    }
    failure.setSource("EMAIL_ALERT");
    failure.setReason("UNPARSED");
    failure.setSender(cut(request.getSender(), 320));
    failure.setSubject(request.getSubject());
    failure.setSnippet(cut(request.getSnippet(), SNIPPET_MAX));
    failure.setDetail(cut(request.getDetail(), 500));
    repository.save(failure);
  }

  @Transactional(readOnly = true)
  public List<ImportFailureResponse> listOpen(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    return repository.findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, ImportFailure.OPEN).stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public long countOpen(Authentication authentication) {
    return repository.countByUserIdAndStatus((UUID) authentication.getPrincipal(), ImportFailure.OPEN);
  }

  /** Replays a stored alert. Fails with a plain message if the cause (usually a missing account) remains. */
  @Transactional
  public void retry(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();
    ImportFailure failure = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new InvalidRequestException("That item no longer exists."));
    if (failure.getPayload() == null) {
      throw new InvalidRequestException("This email could not be read, so there is nothing to retry. Add the transaction by hand, or dismiss it.");
    }
    replay(failure);
  }

  /** Called after an account is created: anything that was only waiting for an account goes through now. */
  @Transactional
  public int retryWaiting(UUID userId) {
    int booked = 0;
    for (ImportFailure failure : repository.findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, ImportFailure.OPEN)) {
      if (!"NO_ACCOUNT".equals(failure.getReason()) || failure.getPayload() == null) {
        continue;
      }
      try {
        replay(failure);
        booked++;
      } catch (RuntimeException exception) {
        log.debug("Alert {} still cannot be booked: {}", failure.getReference(), exception.getMessage());
      }
    }
    return booked;
  }

  @Transactional
  public void dismiss(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();
    ImportFailure failure = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new InvalidRequestException("That item no longer exists."));
    failure.setStatus(ImportFailure.DISMISSED);
    failure.setResolvedAt(Instant.now());
    repository.save(failure);
  }

  private void replay(ImportFailure failure) {
    BankAlertEventRecord event = fromJson(failure.getPayload());
    try {
      transactionService.createFromEmailAlert(
          CreateEmailAlertTransactionRequest.builder()
              .userId(event.userId())
              .bankName(event.bankName())
              .accountType(AccountType.valueOf(event.accountType()))
              .transactionDate(event.transactionDate())
              .description(event.description())
              .amount(event.amount())
              .type(TransactionType.valueOf(event.type()))
              .sourceReference(event.sourceReference())
              .build());
    } catch (AccountNotFoundException exception) {
      throw new InvalidRequestException(
          "There is still no " + event.accountType().toLowerCase().replace('_', ' ') + " account for " + event.bankName() + ". Create it in Accounts and this will go through.");
    }
    failure.setStatus(ImportFailure.RESOLVED);
    failure.setResolvedAt(Instant.now());
    repository.save(failure);
  }

  private ImportFailure existingOrNew(UUID userId, String reference) {
    return repository.findByUserIdAndReference(userId, reference).orElseGet(() -> ImportFailure.builder().userId(userId).reference(reference).build());
  }

  private ImportFailureResponse toResponse(ImportFailure failure) {
    ImportFailureResponse.ImportFailureResponseBuilder out =
        ImportFailureResponse.builder()
            .id(failure.getId())
            .source(failure.getSource())
            .reason(failure.getReason())
            .reference(failure.getReference())
            .sender(failure.getSender())
            .subject(failure.getSubject())
            .snippet(failure.getSnippet())
            .detail(failure.getDetail())
            .createdAt(failure.getCreatedAt());
    if (failure.getPayload() != null) {
      BankAlertEventRecord event = fromJson(failure.getPayload());
      out.bankName(event.bankName()).accountType(event.accountType()).amount(event.amount()).type(event.type()).transactionDate(event.transactionDate()).description(event.description());
    }
    return out.build();
  }

  private String toJson(BankAlertEventRecord event) {
    try {
      return objectMapper.writeValueAsString(event);
    } catch (Exception exception) {
      throw new IllegalStateException("Could not store the alert", exception);
    }
  }

  private BankAlertEventRecord fromJson(String json) {
    try {
      return objectMapper.readValue(json, BankAlertEventRecord.class);
    } catch (Exception exception) {
      throw new IllegalStateException("Stored alert is unreadable", exception);
    }
  }

  private static String cut(String value, int max) {
    return value == null ? null : value.length() <= max ? value : value.substring(0, max);
  }
}
