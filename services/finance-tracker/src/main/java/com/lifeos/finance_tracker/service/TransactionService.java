package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CreateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.MergeTransactionsRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.response.TransactionResponse;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.enums.SourceType;
import com.lifeos.finance_tracker.domains.enums.TransactionStatus;
import com.lifeos.finance_tracker.exception.TransactionNotFoundException;
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

  private final TransactionRepository transactionRepository;

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

  // Manual entry only - sourceType/status are set here, not accepted from the
  // caller. Email-alert and CSV-import transactions are created internally by
  // their own ingestion paths, not through this method.
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

  // {id} is the canonical transaction; every transaction listed in the request
  // gets marked as a duplicate pointing back at it. None are deleted - merging
  // is a soft link so the duplicate's original data stays auditable.
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

  private TransactionResponse toResponse(Transaction transaction) {
    return TransactionResponse.builder()
        .id(transaction.getId())
        .accountId(transaction.getAccountId())
        .transactionDate(transaction.getTransactionDate())
        .description(transaction.getDescription())
        .amount(transaction.getAmount())
        .type(transaction.getType())
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
