package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CategorizeTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateEmailAlertTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.MergeTransactionsRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.response.TransactionResponse;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.enums.SourceType;
import com.lifeos.finance_tracker.domains.enums.TransactionStatus;
import com.lifeos.finance_tracker.exception.AccountNotFoundException;
import com.lifeos.finance_tracker.exception.TransactionNotFoundException;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TransactionService {

  private final AccountRepository accountRepository;
  private final TransactionRepository transactionRepository;
  private final CategorizationService categorizationService;

  public List<TransactionResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return transactionRepository.findAllByUserIdOrderByTransactionDateDesc(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  public TransactionResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toResponse(
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id)));
  }

  public TransactionResponse save(Authentication authentication, CreateTransactionRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        Transaction.builder()
            .accountId(request.getAccountId())
            .userId(userId)
            .transactionDate(request.getTransactionDate())
            .description(request.getDescription())
            .amount(request.getAmount())
            .type(request.getType())
            .tags(request.getTags())
            .notes(request.getNotes())
            .receiptUrl(request.getReceiptUrl())
            .isRecurring(false)
            .sourceType(SourceType.MANUAL_ENTRY)
            .isReconciled(false)
            .isDuplicate(false)
            .status(TransactionStatus.ACTIVE)
            .importedAt(Instant.now())
            .build();

    categorizationService.categorize(transaction).ifPresent(transaction::setCategoryId);

    return toResponse(transactionRepository.save(transaction));
  }

  public TransactionResponse update(
      Authentication authentication, UUID id, UpdateTransactionRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    if (request.getDescription() != null) {
      transaction.setDescription(request.getDescription());
    }

    if (request.getAmount() != null) {
      transaction.setAmount(request.getAmount());
    }

    if (request.getType() != null) {
      transaction.setType(request.getType());
    }

    if (request.getTags() != null) {
      transaction.setTags(request.getTags());
    }

    if (request.getNotes() != null) {
      transaction.setNotes(request.getNotes());
    }

    if (request.getReceiptUrl() != null) {
      transaction.setReceiptUrl(request.getReceiptUrl());
    }

    return toResponse(transactionRepository.save(transaction));
  }

  public void delete(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    transactionRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new TransactionNotFoundException(id));

    transactionRepository.deleteByIdAndUserId(id, userId);
  }

  public TransactionResponse categorize(
      Authentication authentication, UUID id, CategorizeTransactionRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    transaction.setCategoryId(request.getCategoryId());
    transaction.setCategoryManuallySet(true);

    return toResponse(transactionRepository.save(transaction));
  }

  public TransactionResponse merge(
      Authentication authentication, UUID id, MergeTransactionsRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction canonical =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    List<Transaction> duplicates =
        transactionRepository.findAllByIdInAndUserId(request.getDuplicateTransactionIds(), userId);

    duplicates.forEach(
        duplicate -> {
          duplicate.setDuplicate(true);
          duplicate.setDuplicateOf(canonical.getId());
        });

    transactionRepository.saveAll(duplicates);

    return toResponse(canonical);
  }

  public void createFromEmailAlert(CreateEmailAlertTransactionRequest request) {
    boolean isExisting =
        transactionRepository.existsBySourceReference(request.getSourceReference());

    if (isExisting) {
      return;
    }

    Account account =
        accountRepository
            .findByUserIdAndBankNameAndAccountType(
                request.getUserId(), request.getBankName(), request.getAccountType())
            .orElseThrow(
                () -> new AccountNotFoundException(request.getBankName(), request.getAccountType()));

    Transaction transaction =
        Transaction.builder()
            .accountId(account.getId())
            .userId(account.getUserId())
            .transactionDate(request.getTransactionDate())
            .description(request.getDescription())
            .amount(request.getAmount())
            .type(request.getType())
            .sourceType(SourceType.EMAIL_ALERT)
            .sourceReference(request.getSourceReference())
            .status(TransactionStatus.RECONCILED)
            .isReconciled(true)
            .importedAt(Instant.now())
            .build();

    categorizationService.categorize(transaction).ifPresent(transaction::setCategoryId);

    transactionRepository.save(transaction);
  }

  private TransactionResponse toResponse(Transaction transaction) {
    return TransactionResponse.builder()
        .id(transaction.getId())
        .accountId(transaction.getAccountId())
        .transactionDate(transaction.getTransactionDate())
        .description(transaction.getDescription())
        .amount(transaction.getAmount())
        .type(transaction.getType())
        .categoryId(transaction.getCategoryId())
        .categoryManuallySet(transaction.isCategoryManuallySet())
        .tags(transaction.getTags())
        .notes(transaction.getNotes())
        .receiptUrl(transaction.getReceiptUrl())
        .isRecurring(transaction.isRecurring())
        .sourceType(transaction.getSourceType())
        .sourceReference(transaction.getSourceReference())
        .isReconciled(transaction.isReconciled())
        .isDuplicate(transaction.isDuplicate())
        .duplicateOf(transaction.getDuplicateOf())
        .status(transaction.getStatus())
        .importedAt(transaction.getImportedAt())
        .createdAt(transaction.getCreatedAt())
        .updatedAt(transaction.getUpdatedAt())
        .build();
  }
}
