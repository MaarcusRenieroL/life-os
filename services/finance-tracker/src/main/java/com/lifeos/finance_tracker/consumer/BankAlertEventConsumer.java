package com.lifeos.finance_tracker.consumer;

import com.lifeos.common.events.BankAlertEventRecord;
import com.lifeos.finance_tracker.domains.dto.request.CreateEmailAlertTransactionRequest;
import com.lifeos.finance_tracker.domains.enums.AccountType;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Consumes what batches' Gmail bank-alert poller publishes to {@code bank-alert-events} (see
 * GmailSyncService in batches, which replaced a synchronous per-email REST call with this topic -
 * same N-sequential-calls fix as job-tracker's email pipeline). createFromEmailAlert already
 * dedupes on sourceReference, so a redelivered event is a safe no-op; an unmatched account (no
 * account row for the parsed bank/account-type combo) or a corrupt enum value is caught and
 * logged here rather than crashing the consumer, matching the previous per-email try/catch
 * behavior in GmailSyncService.processEmails. */
@Component
@RequiredArgsConstructor
public class BankAlertEventConsumer {

  private static final Logger log = LoggerFactory.getLogger(BankAlertEventConsumer.class);

  private final TransactionService transactionService;

  @KafkaListener(
      topics = "bank-alert-events",
      groupId = "finance-tracker-service",
      containerFactory = "bankAlertEventListenerContainerFactory")
  public void listen(BankAlertEventRecord event) {
    try {
      CreateEmailAlertTransactionRequest request =
          CreateEmailAlertTransactionRequest.builder()
              .userId(event.userId())
              .bankName(event.bankName())
              .accountType(AccountType.valueOf(event.accountType()))
              .transactionDate(event.transactionDate())
              .description(event.description())
              .amount(event.amount())
              .type(TransactionType.valueOf(event.type()))
              .sourceReference(event.sourceReference())
              .build();

      transactionService.createFromEmailAlert(request);
    } catch (Exception e) {
      log.error(
          "Failed to process bank alert {}: {}", event.sourceReference(), e.getMessage(), e);
    }
  }
}
