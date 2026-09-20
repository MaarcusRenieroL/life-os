package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CategorizeTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateCsvImportTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateEmailAlertTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateQuickCaptureTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.DisputeTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.MergeTransactionsRequest;
import com.lifeos.finance_tracker.domains.dto.request.RenameTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateTransactionCategoriesRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.response.CsvImportBatchResponse;
import com.lifeos.finance_tracker.domains.dto.response.TransactionResponse;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.entity.Category;
import com.lifeos.finance_tracker.domains.entity.CategorizationRule;
import com.lifeos.finance_tracker.domains.entity.Merchant;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.entity.TransactionCategory;
import com.lifeos.finance_tracker.domains.enums.SourceType;
import com.lifeos.finance_tracker.domains.enums.TransactionStatus;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.domains.record.PageResponse;
import com.lifeos.finance_tracker.exception.AccountNotFoundException;
import com.lifeos.finance_tracker.exception.CategoryNotFoundException;
import com.lifeos.finance_tracker.exception.NoDefaultAccountException;
import com.lifeos.finance_tracker.exception.TransactionNotFoundException;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.finance_tracker.repository.CategoryRepository;
import com.lifeos.finance_tracker.repository.TransactionCategoryRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.lifeos.finance_tracker.util.MerchantNameNormalizer;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
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

  private static final Logger log = LoggerFactory.getLogger(TransactionService.class);

  // Analytics caches are keyed per-userId-per-report-shape (getCategoryAnalytics by userId AND
  // categoryId, getTopMerchants by userId AND limit) - Spring's declarative @CacheEvict can't
  // evict "every entry for this userId" out of a parameterized cache without enumerating every
  // key combination, so on every write path below we evict each analytics cache in full
  // (allEntries = true) rather than try to target just the affected user. With a 5-minute TTL
  // this is a deliberately blunt but simple invalidation strategy.
  private static final String CACHE_ANALYTICS_DASHBOARD = "finance-analytics-dashboard";
  private static final String CACHE_ANALYTICS_CATEGORY = "finance-analytics-category";
  private static final String CACHE_ANALYTICS_TRENDS = "finance-analytics-trends";
  private static final String CACHE_ANALYTICS_MERCHANTS = "finance-analytics-merchants";

  private final AccountRepository accountRepository;
  private final TransactionRepository transactionRepository;
  private final CategoryRepository categoryRepository;
  private final TransactionCategoryRepository transactionCategoryRepository;
  private final CategorizationService categorizationService;
  private final MerchantService merchantService;
  private final BudgetSpendService budgetSpendService;

  @Transactional(readOnly = true)
  public PageResponse<TransactionResponse> getAllPaginated(
      Authentication authentication,
      int page,
      int size,
      String search,
      String status,
      UUID categoryId,
      SourceType sourceType) {
    UUID userId = (UUID) authentication.getPrincipal();

    Pageable pageable = PageRequest.of(page, size, Sort.by("transactionDate").descending());

    Page<Transaction> transactions =
        transactionRepository.findAll(
            TransactionSpecifications.matching(userId, search, status, categoryId, sourceType),
            pageable);

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

  @Transactional(readOnly = true)
  public TransactionResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    Transaction transaction =
        transactionRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new TransactionNotFoundException(id));

    return toResponse(transaction, categoryIdsFor(id));
  }

  @Caching(
      evict = {
        @CacheEvict(cacheNames = CACHE_ANALYTICS_DASHBOARD, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_CATEGORY, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_TRENDS, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_MERCHANTS, allEntries = true)
      })
  public TransactionResponse save(Authentication authentication, CreateTransactionRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Account account =
        accountRepository
            .findByIdAndUserId(request.getAccountId(), userId)
            .orElseThrow(() -> new AccountNotFoundException(request.getAccountId()));

    Transaction transaction =
        createAndPersist(
            account,
            userId,
            request.getTransactionDate(),
            request.getDescription(),
            request.getAmount(),
            request.getType(),
            request.getNotes(),
            request.getReceiptUrl(),
            SourceType.MANUAL_ENTRY,
            TransactionStatus.ACTIVE,
            false);

    return toResponse(transaction, List.of());
  }

  /**
   * Backs core's quick-capture flow (POST /v1/finance/internal/quick-transaction) - core's AI
   * classifier turns free text like "spent 400 on groceries" into {@code
   * {description, amount, type}} with no account context at all, so this resolves a default
   * account for the user (see {@link #resolveDefaultAccount}) rather than requiring the caller to
   * know which account to use, then runs the transaction through the exact same
   * categorization/merchant/budget/cache-eviction pipeline as a normal manual entry via {@link
   * #createAndPersist} - a quick-captured transaction should show up in analytics and budgets
   * exactly like any other one, not be a second-class stripped-down record.
   */
  @Caching(
      evict = {
        @CacheEvict(cacheNames = CACHE_ANALYTICS_DASHBOARD, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_CATEGORY, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_TRENDS, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_MERCHANTS, allEntries = true)
      })
  public TransactionResponse createFromQuickCapture(CreateQuickCaptureTransactionRequest request) {
    Account account = resolveDefaultAccount(request.getUserId());

    Transaction transaction =
        createAndPersist(
            account,
            request.getUserId(),
            Instant.now(),
            request.getDescription(),
            request.getAmount(),
            request.getType(),
            null,
            null,
            SourceType.MANUAL_ENTRY,
            TransactionStatus.ACTIVE,
            false);

    return toResponse(transaction, List.of());
  }

  /**
   * Picks a default account for a quick-capture transaction, which arrives with no account
   * context at all (free text has no way to say which account was used). If the user has exactly
   * one active account, that's an unambiguous choice. Otherwise (zero accounts, or several with
   * no signal about which is "default") fall back to whichever is flagged {@code isPrimary} -
   * {@link Account#isPrimary} already exists for this purpose. If neither rule resolves to a
   * single account (no accounts at all, or several non-primary accounts), guessing would silently
   * misattribute the spend, so this fails loudly instead via {@link NoDefaultAccountException}
   * (mapped to 422 by GlobalExceptionHandler).
   */
  private Account resolveDefaultAccount(UUID userId) {
    List<Account> activeAccounts =
        accountRepository.findAllByUserId(userId).stream().filter(Account::isActive).toList();

    if (activeAccounts.size() == 1) {
      return activeAccounts.get(0);
    }

    return activeAccounts.stream()
        .filter(Account::isPrimary)
        .findFirst()
        .orElseThrow(NoDefaultAccountException::new);
  }

  /**
   * Shared by every "create one transaction the normal way" path (manual entry via {@link #save},
   * quick-capture via {@link #createFromQuickCapture}) - builds the transaction, runs it through
   * categorization ({@link CategorizationService#categorize(Transaction)}), applies it to the
   * account's running balance, records it against the merchant ({@link
   * MerchantService#recordTransaction}), records budget spend if it's an expense ({@link
   * #recordBudgetSpendIfExpense}), and persists it. The email-alert and CSV-import paths don't go
   * through here since they also need source-reference/description-normalization dedup logic this
   * helper doesn't do.
   */
  private Transaction createAndPersist(
      Account account,
      UUID userId,
      Instant transactionDate,
      String description,
      BigDecimal amount,
      TransactionType type,
      String notes,
      String receiptUrl,
      SourceType sourceType,
      TransactionStatus status,
      boolean isReconciled) {
    Transaction transaction =
        Transaction.builder()
            .accountId(account.getId())
            .userId(userId)
            .transactionDate(transactionDate)
            .description(description)
            .amount(amount)
            .type(type)
            .notes(notes)
            .receiptUrl(receiptUrl)
            .isRecurring(false)
            .sourceType(sourceType)
            .isReconciled(isReconciled)
            .isDuplicate(false)
            .status(status)
            .importedAt(Instant.now())
            .build();

    categorizationService.categorize(transaction).ifPresent(transaction::setCategoryId);

    applyToBalance(account, transaction.getAmount(), transaction.getType());
    merchantService.recordTransaction(userId, transaction.getDescription(), transaction.getAmount());
    recordBudgetSpendIfExpense(transaction);

    return transactionRepository.save(transaction);
  }

  @Caching(
      evict = {
        @CacheEvict(cacheNames = CACHE_ANALYTICS_DASHBOARD, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_CATEGORY, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_TRENDS, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_MERCHANTS, allEntries = true)
      })
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

  @Caching(
      evict = {
        @CacheEvict(cacheNames = CACHE_ANALYTICS_DASHBOARD, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_CATEGORY, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_TRENDS, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_MERCHANTS, allEntries = true)
      })
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
        transactionRepository.findAllByUserIdAndDescriptionIgnoreCase(userId, rawDescription);

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

  @Caching(
      evict = {
        @CacheEvict(cacheNames = CACHE_ANALYTICS_DASHBOARD, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_CATEGORY, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_TRENDS, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_MERCHANTS, allEntries = true)
      })
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

  @Caching(
      evict = {
        @CacheEvict(cacheNames = CACHE_ANALYTICS_DASHBOARD, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_CATEGORY, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_TRENDS, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_MERCHANTS, allEntries = true)
      })
  public void createFromCsvImport(CreateCsvImportTransactionRequest request) {
    Account account =
        accountRepository
            .findByIdAndUserId(request.getAccountId(), request.getUserId())
            .orElseThrow(() -> new AccountNotFoundException(request.getAccountId()));

    importCsvRow(account, request);
  }

  /**
   * Imports a whole parsed bank statement in one call instead of the caller (batches'
   * StatementImportService) making one HTTP round-trip per row - for a multi-hundred-row
   * statement that was a multi-hundred-request serial network waterfall. The account is fetched
   * once and its running balance accumulated in memory across every row via the same {@link
   * #applyToBalance} call each single-row import already used, instead of a fresh fetch per row.
   *
   * <p>A bad row is skipped (same "keep going" behavior the caller used to implement itself with
   * a per-request try/catch) rather than failing the whole import - since this now runs inside
   * one transaction (class-level {@code @Transactional} above), a skipped row's exception is
   * caught here and never allowed to escape the method, so it can't roll back the rows already
   * imported earlier in the same batch.
   *
   * <p>Every row is expected to carry the same userId/accountId (one statement import is always
   * for one account) - the account is resolved once from the first row rather than requiring the
   * caller to pass it separately.
   *
   * <p>Per-row work that used to hit the database is also loaded/flushed once for the whole
   * batch instead of once per row: the user's merchants and active categorization rules are
   * fetched up front (see {@link MerchantService#loadAllForUser} and {@link
   * CategorizationService#loadActiveRules}) and mutated in memory by the per-row batch overloads
   * of {@code resolveCorrectedName}/{@code recordTransaction}/{@code categorize}, and every new
   * or touched {@link Transaction}, {@link Merchant} and {@link CategorizationRule} is persisted
   * with a single {@code saveAll} after the loop rather than row-by-row.
   */
  @Caching(
      evict = {
        @CacheEvict(cacheNames = CACHE_ANALYTICS_DASHBOARD, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_CATEGORY, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_TRENDS, allEntries = true),
        @CacheEvict(cacheNames = CACHE_ANALYTICS_MERCHANTS, allEntries = true)
      })
  public CsvImportBatchResponse createFromCsvImportBatch(List<CreateCsvImportTransactionRequest> requests) {
    UUID userId = requests.get(0).getUserId();
    UUID accountId = requests.get(0).getAccountId();
    Account account =
        accountRepository
            .findByIdAndUserId(accountId, userId)
            .orElseThrow(() -> new AccountNotFoundException(accountId));

    List<Merchant> merchants = merchantService.loadAllForUser(userId);
    List<CategorizationRule> categorizationRules = categorizationService.loadActiveRules(userId);
    Set<Merchant> touchedMerchants = new LinkedHashSet<>();
    List<Transaction> toSave = new ArrayList<>(requests.size());

    for (CreateCsvImportTransactionRequest request : requests) {
      try {
        Transaction transaction =
            buildCsvRowTransaction(account, request, merchants, categorizationRules, touchedMerchants);
        if (transaction != null) {
          toSave.add(transaction);
        }
      } catch (RuntimeException exception) {
        log.warn("Skipping a row in CSV import batch for account {}: {}", accountId, exception.getMessage());
      }
    }

    transactionRepository.saveAll(toSave);
    merchantService.saveAllTouched(userId, touchedMerchants);
    categorizationService.saveAllTouched(categorizationRules);

    return new CsvImportBatchResponse(requests.size(), toSave.size());
  }

  /** Batch-import counterpart of {@link #importCsvRow} - identical dedup/build/categorize/balance
   * logic, but resolves the merchant and rule lookups against the batch's pre-loaded in-memory
   * data (see {@link #createFromCsvImportBatch}) instead of querying per row, and returns the
   * built transaction for the caller to persist via {@code saveAll} rather than saving it here.
   * Returns null for a row silently deduplicated against an existing transaction (not an error,
   * same as the single-row method's early return). */
  private Transaction buildCsvRowTransaction(
      Account account,
      CreateCsvImportTransactionRequest request,
      List<Merchant> merchants,
      List<CategorizationRule> categorizationRules,
      Set<Merchant> touchedMerchants) {
    String description =
        merchantService
            .resolveCorrectedName(merchants, request.getDescription())
            .orElseGet(() -> MerchantNameNormalizer.normalize(request.getDescription()));

    Instant windowStart = request.getTransactionDate().minus(1, ChronoUnit.DAYS);
    Instant windowEnd = request.getTransactionDate().plus(1, ChronoUnit.DAYS);

    boolean isDuplicate =
        transactionRepository.existsByAccountIdAndAmountAndTransactionDateBetweenAndDescription(
            request.getAccountId(), request.getAmount(), windowStart, windowEnd, description);

    if (isDuplicate) {
      return null;
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

    categorizationService.categorize(transaction, categorizationRules).ifPresent(transaction::setCategoryId);

    applyToBalance(account, transaction.getAmount(), transaction.getType());

    Merchant touched =
        merchantService.recordTransaction(merchants, account.getUserId(), description, transaction.getAmount());
    if (touched != null) {
      touchedMerchants.add(touched);
    }

    recordBudgetSpendIfExpense(transaction);

    return transaction;
  }

  /** Returns false for a row silently deduplicated against an existing transaction (not an
   * error, same as the original single-row method's early return), true if it was persisted. */
  private boolean importCsvRow(Account account, CreateCsvImportTransactionRequest request) {
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
      return false;
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
    return true;
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
