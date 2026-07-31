package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CategorizeTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateCsvImportTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateEmailAlertTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.DisputeTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.MergeTransactionsRequest;
import com.lifeos.finance_tracker.domains.dto.request.RenameTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateTransactionCategoriesRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.response.TransactionResponse;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.entity.Category;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.entity.TransactionCategory;
import com.lifeos.finance_tracker.domains.enums.SourceType;
import com.lifeos.finance_tracker.domains.enums.TransactionStatus;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.domains.record.PageResponse;
import com.lifeos.finance_tracker.exception.AccountNotFoundException;
import com.lifeos.finance_tracker.exception.CategoryNotFoundException;
import com.lifeos.finance_tracker.exception.TransactionNotFoundException;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.finance_tracker.repository.CategoryRepository;
import com.lifeos.finance_tracker.repository.TransactionCategoryRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.lifeos.finance_tracker.util.MerchantNameNormalizer;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class TransactionService {

  private final AccountRepository accountRepository;
  private final TransactionRepository transactionRepository;
  private final CategoryRepository categoryRepository;
  private final TransactionCategoryRepository transactionCategoryRepository;
  private final CategorizationService categorizationService;
  private final MerchantService merchantService;
  private final BudgetSpendService budgetSpendService;

  public PageResponse<TransactionResponse> getAllPaginated(
      Authentication authentication, int page, int size) {
    UUID userId = (UUID) authentication.getPrincipal();

    Pageable pageable = PageRequest.of(page, size, Sort.by("transactionDate").descending());

    Page<Transaction> transactions = transactionRepository.findAllByUserId(userId, pageable);

    Map<UUID, List<UUID>> tagsByTransactionId =
        transactionCategoryRepository
            .findAllByTransactionIdIn(transactions.map(Transaction::getId).toList())
            .stream()
            .collect(
                Collectors.groupingBy(
                    TransactionCategory::getTransactionId,
                    Collectors.mapping(TransactionCategory::getCategoryId, Collectors.toList())));

    Page<TransactionResponse> responses =
        transactions.map(
            transaction ->
                toResponse(
                    transaction, tagsByTransactionId.getOrDefault(transaction.getId(), List.of())));

    return PageResponse.from(responses);
  }

  public TransactionResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    return toResponse(transaction, categoryIdsFor(id));
  }

  public TransactionResponse save(Authentication authentication, CreateTransactionRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Account account =
        accountRepository
            .findByIdAndUserId(request.getAccountId(), userId)
            .orElseThrow(() -> new AccountNotFoundException(request.getAccountId()));

    Transaction transaction =
        Transaction.builder()
            .accountId(request.getAccountId())
            .userId(userId)
            .transactionDate(request.getTransactionDate())
            .description(request.getDescription())
            .amount(request.getAmount())
            .type(request.getType())
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

    applyToBalance(account, transaction.getAmount(), transaction.getType());
    merchantService.recordTransaction(userId, transaction.getDescription(), transaction.getAmount());
    recordBudgetSpendIfExpense(transaction);

    return toResponse(transactionRepository.save(transaction), List.of());
  }

  public TransactionResponse update(
      Authentication authentication, UUID id, UpdateTransactionRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    BigDecimal previousAmount = transaction.getAmount();
    TransactionType previousType = transaction.getType();
    boolean amountOrTypeChanged =
        (request.getAmount() != null && request.getAmount().compareTo(previousAmount) != 0)
            || (request.getType() != null && request.getType() != previousType);

    if (request.getDescription() != null) {
      transaction.setDescription(request.getDescription());
    }

    if (request.getAmount() != null) {
      transaction.setAmount(request.getAmount());
    }

    if (request.getType() != null) {
      transaction.setType(request.getType());
    }

    if (request.getNotes() != null) {
      transaction.setNotes(request.getNotes());
    }

    if (request.getReceiptUrl() != null) {
      transaction.setReceiptUrl(request.getReceiptUrl());
    }

    if (amountOrTypeChanged) {
      accountRepository
          .findByIdAndUserId(transaction.getAccountId(), userId)
          .ifPresent(
              account -> {
                applyToBalance(account, previousAmount, reverse(previousType));
                applyToBalance(account, transaction.getAmount(), transaction.getType());
              });
    }

    return toResponse(transactionRepository.save(transaction), categoryIdsFor(id));
  }

  public void delete(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    accountRepository
        .findByIdAndUserId(transaction.getAccountId(), userId)
        .ifPresent(account -> applyToBalance(account, transaction.getAmount(), reverse(transaction.getType())));

    transactionRepository.deleteByIdAndUserId(id, userId);
  }

  // Adjusts an account's running balance by a transaction's amount - CREDIT
  // adds, DEBIT subtracts. Called on every transaction creation path (manual,
  // CSV import, email alert) so currentBalance stays accurate without
  // requiring a manual reconcile() after every import, and reversed on
  // delete so removing a transaction doesn't leave the balance permanently
  // wrong.
  private void applyToBalance(Account account, BigDecimal amount, TransactionType type) {
    BigDecimal currentBalance =
        account.getCurrentBalance() != null ? account.getCurrentBalance() : BigDecimal.ZERO;
    if (type == TransactionType.CREDIT) {
      account.setCurrentBalance(currentBalance.add(amount));
    } else if (type == TransactionType.DEBIT) {
      account.setCurrentBalance(currentBalance.subtract(amount));
    }
    accountRepository.save(account);
  }

  private TransactionType reverse(TransactionType type) {
    if (type == TransactionType.CREDIT) return TransactionType.DEBIT;
    if (type == TransactionType.DEBIT) return TransactionType.CREDIT;
    return type;
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

    categorizationService.learnFromCorrection(
        userId, transaction.getDescription(), request.getCategoryId());

    return toResponse(transactionRepository.save(transaction), categoryIdsFor(id));
  }

  // Called when a user corrects a transaction's display name (e.g. a
  // truncated bank narration like "Maarcu S R" -> "Maarcus Reniero"). Renames
  // this transaction, teaches the merchant-alias mapping so future imports of
  // the same raw narration resolve to the corrected name automatically (see
  // MerchantService.resolveCorrectedName, wired into createFromCsvImport/
  // createFromEmailAlert), and retroactively renames every other past
  // transaction for this user with the same raw description so the fix
  // applies everywhere at once, not just going forward.
  public TransactionResponse renameTransaction(
      Authentication authentication, UUID id, RenameTransactionRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    String rawDescription = transaction.getDescription();
    String correctedName = request.getCorrectedName().trim();

    merchantService.rename(userId, rawDescription, correctedName);

    List<Transaction> matches =
        transactionRepository.findAllByUserIdOrderByTransactionDateDesc(userId).stream()
            .filter(t -> t.getDescription() != null && t.getDescription().equalsIgnoreCase(rawDescription))
            .toList();

    matches.forEach(t -> t.setDescription(correctedName));
    transactionRepository.saveAll(matches);

    Transaction saved = matches.stream().filter(t -> t.getId().equals(id)).findFirst().orElse(transaction);

    return toResponse(saved, categoryIdsFor(id));
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

    return toResponse(canonical, categoryIdsFor(canonical.getId()));
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
                () ->
                    new AccountNotFoundException(request.getBankName(), request.getAccountType()));

    String description =
        merchantService
            .resolveCorrectedName(account.getUserId(), request.getDescription())
            .orElseGet(() -> MerchantNameNormalizer.normalize(request.getDescription()));

    Transaction transaction =
        Transaction.builder()
            .accountId(account.getId())
            .userId(account.getUserId())
            .transactionDate(request.getTransactionDate())
            .description(description)
            .amount(request.getAmount())
            .type(request.getType())
            .sourceType(SourceType.EMAIL_ALERT)
            .sourceReference(request.getSourceReference())
            .status(TransactionStatus.RECONCILED)
            .isReconciled(true)
            .importedAt(Instant.now())
            .build();

    categorizationService.categorize(transaction).ifPresent(transaction::setCategoryId);

    applyToBalance(account, transaction.getAmount(), transaction.getType());
    merchantService.recordTransaction(account.getUserId(), description, transaction.getAmount());
    recordBudgetSpendIfExpense(transaction);

    transactionRepository.save(transaction);
  }

  public void createFromCsvImport(CreateCsvImportTransactionRequest request) {
    Account account =
        accountRepository
            .findByIdAndUserId(request.getAccountId(), request.getUserId())
            .orElseThrow(() -> new AccountNotFoundException(request.getAccountId()));

    String description =
        merchantService
            .resolveCorrectedName(account.getUserId(), request.getDescription())
            .orElseGet(() -> MerchantNameNormalizer.normalize(request.getDescription()));

    // Dedup must also match on description, not just amount+date-window -
    // matching amount alone silently dropped legitimate same-amount
    // transactions on nearby dates (e.g. two separate ₹2 Google Cloud
    // auto-debits a few days apart both fell inside the ±1 day window and
    // the second one was discarded as a "duplicate").
    Instant windowStart = request.getTransactionDate().minus(1, ChronoUnit.DAYS);
    Instant windowEnd = request.getTransactionDate().plus(1, ChronoUnit.DAYS);

    boolean isDuplicate =
        transactionRepository.existsByAccountIdAndAmountAndTransactionDateBetweenAndDescription(
            request.getAccountId(), request.getAmount(), windowStart, windowEnd, description);

    if (isDuplicate) {
      return;
    }

    Transaction transaction =
        Transaction.builder()
            .accountId(account.getId())
            .userId(account.getUserId())
            .transactionDate(request.getTransactionDate())
            .description(description)
            .amount(request.getAmount())
            .type(request.getType())
            .sourceType(SourceType.CSV_IMPORT)
            .status(TransactionStatus.RECONCILED)
            .isReconciled(true)
            .importedAt(Instant.now())
            .build();

    categorizationService.categorize(transaction).ifPresent(transaction::setCategoryId);

    applyToBalance(account, transaction.getAmount(), transaction.getType());
    merchantService.recordTransaction(account.getUserId(), description, transaction.getAmount());
    recordBudgetSpendIfExpense(transaction);

    transactionRepository.save(transaction);
  }

  // Records spend against the transaction's category budget (if any) so
  // Budget.alertThreshold notifications actually fire. Only hooked into the
  // initial-categorization paths (manual entry, email alert, CSV import) -
  // not into categorize()/updateCategories() recategorization, since
  // BudgetSpendService only supports incrementing the running total and
  // re-recording on every recategorization would double-count spend that
  // was already attributed to a transaction's original category.
  private void recordBudgetSpendIfExpense(Transaction transaction) {
    if (transaction.getType() == TransactionType.DEBIT && transaction.getCategoryId() != null) {
      budgetSpendService.recordSpend(
          transaction.getUserId(),
          transaction.getCategoryId(),
          transaction.getAmount(),
          transaction.getTransactionDate());
    }
  }

  public TransactionResponse dispute(
      Authentication authentication, UUID id, DisputeTransactionRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    transaction.setStatus(TransactionStatus.DISPUTED);
    transaction.setDisputeReason(request.getReason());
    transaction.setDisputeDate(Instant.now());

    return toResponse(transactionRepository.save(transaction), categoryIdsFor(id));
  }

  public TransactionResponse updateCategories(
      Authentication authentication, UUID id, UpdateTransactionCategoriesRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    Set<UUID> accessibleCategoryIds =
        categoryRepository.findAllByUserIdOrUserIdIsNull(userId).stream()
            .map(Category::getId)
            .collect(Collectors.toSet());

    for (UUID categoryId : request.getCategoryIds()) {
      if (!accessibleCategoryIds.contains(categoryId)) {
        throw new CategoryNotFoundException(categoryId);
      }
    }

    transactionCategoryRepository.deleteByTransactionId(id);

    List<UUID> categoryIds = request.getCategoryIds().stream().distinct().toList();

    List<TransactionCategory> links =
        categoryIds.stream()
            .map(
                categoryId ->
                    TransactionCategory.builder().transactionId(id).categoryId(categoryId).build())
            .toList();

    transactionCategoryRepository.saveAll(links);

    // The first selected category doubles as the transaction's primary categoryId,
    // so features that only know about a single category (budgets, analytics,
    // the "needs review" filter, rule learning) keep working - the multi-category
    // list is the source of truth, this is just a projection of it.
    if (!categoryIds.isEmpty()) {
      UUID primaryCategoryId = categoryIds.get(0);
      transaction.setCategoryId(primaryCategoryId);
      transaction.setCategoryManuallySet(true);
      transactionRepository.save(transaction);
      categorizationService.learnFromCorrection(userId, transaction.getDescription(), primaryCategoryId);
    }

    return toResponse(transaction, categoryIds);
  }

  private List<UUID> categoryIdsFor(UUID transactionId) {
    return transactionCategoryRepository.findAllByTransactionId(transactionId).stream()
        .map(TransactionCategory::getCategoryId)
        .toList();
  }

  private TransactionResponse toResponse(Transaction transaction, List<UUID> categoryIds) {
    return TransactionResponse.builder()
        .id(transaction.getId())
        .accountId(transaction.getAccountId())
        .transactionDate(transaction.getTransactionDate())
        .description(transaction.getDescription())
        .amount(transaction.getAmount())
        .type(transaction.getType())
        .categoryId(transaction.getCategoryId())
        .categoryManuallySet(transaction.isCategoryManuallySet())
        .categoryIds(categoryIds == null ? Collections.emptyList() : categoryIds)
        .notes(transaction.getNotes())
        .receiptUrl(transaction.getReceiptUrl())
        .disputeReason(transaction.getDisputeReason())
        .disputeDate(transaction.getDisputeDate())
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
