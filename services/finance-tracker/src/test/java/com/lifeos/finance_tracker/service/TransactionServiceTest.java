package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.finance_tracker.domains.dto.request.CreateQuickCaptureTransactionRequest;
import com.lifeos.finance_tracker.domains.dto.request.CreateTransferRequest;
import com.lifeos.finance_tracker.domains.dto.response.TransactionResponse;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.exception.NoDefaultAccountException;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.finance_tracker.repository.CategoryRepository;
import com.lifeos.finance_tracker.repository.TransactionCategoryRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

  @Mock private AccountRepository accountRepository;
  @Mock private TransactionRepository transactionRepository;
  @Mock private CategoryRepository categoryRepository;
  @Mock private TransactionCategoryRepository transactionCategoryRepository;
  @Mock private CategorizationService categorizationService;
  @Mock private MerchantService merchantService;
  @Mock private BudgetSpendService budgetSpendService;
  @Mock private AccountBalanceService accountBalanceService;
  @Mock private AccountResolver accountResolver;

  private TransactionService transactionService;

  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    transactionService =
        new TransactionService(
            accountRepository,
            transactionRepository,
            categoryRepository,
            transactionCategoryRepository,
            categorizationService,
            merchantService,
            budgetSpendService,
            accountBalanceService,
            accountResolver);

    lenient().when(categorizationService.categorize(any(Transaction.class))).thenReturn(Optional.empty());
    lenient()
        .when(transactionRepository.save(any(Transaction.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  private Account account(boolean isActive, boolean isPrimary) {
    return Account.builder()
        .id(UUID.randomUUID())
        .userId(userId)
        .isActive(isActive)
        .isPrimary(isPrimary)
        .currentBalance(BigDecimal.ZERO)
        .build();
  }

  @Test
  void quickCaptureUsesTheOnlyActiveAccountWhenExactlyOneExists() {
    Account onlyAccount = account(true, false);

    when(accountRepository.findAllByUserId(userId)).thenReturn(List.of(onlyAccount));

    CreateQuickCaptureTransactionRequest request = quickCaptureRequest();

    TransactionResponse response = transactionService.createFromQuickCapture(request);

    assertThat(response.getAccountId()).isEqualTo(onlyAccount.getId());
    verify(merchantService).recordTransaction(userId, "groceries", new BigDecimal("400"));
  }

  @Test
  void subscriptionChargeIsBookedAsARecurringDebitWithItsSourceReferenceAndCategory() {
    Account acct = account(true, false);
    UUID categoryId = UUID.randomUUID();
    when(transactionRepository.existsBySourceReference("subscription:x:2026-09-30")).thenReturn(false);
    when(accountRepository.findByIdAndUserId(acct.getId(), userId)).thenReturn(Optional.of(acct));

    Optional<Transaction> booked =
        transactionService.createSubscriptionCharge(userId, acct.getId(), java.time.Instant.now(), "Netflix", new BigDecimal("649"), categoryId, "subscription:x:2026-09-30");

    assertThat(booked).isPresent();
    Transaction t = booked.get();
    assertThat(t.getType()).isEqualTo(TransactionType.DEBIT);
    assertThat(t.isRecurring()).isTrue();
    assertThat(t.getSourceReference()).isEqualTo("subscription:x:2026-09-30");
    assertThat(t.getCategoryId()).isEqualTo(categoryId);
    assertThat(t.isCategoryManuallySet()).isTrue();
    verify(categorizationService, never()).categorize(any(Transaction.class));
  }

  @Test
  void subscriptionChargeIsSkippedWhenThatBillingWasAlreadyBooked() {
    when(transactionRepository.existsBySourceReference("subscription:x:2026-09-30")).thenReturn(true);

    Optional<Transaction> booked =
        transactionService.createSubscriptionCharge(userId, UUID.randomUUID(), java.time.Instant.now(), "Netflix", BigDecimal.TEN, null, "subscription:x:2026-09-30");

    assertThat(booked).isEmpty();
    verify(transactionRepository, never()).save(any());
  }

  @Test
  void quickCaptureFailsClearlyWhenUserHasNoAccounts() {
    when(accountRepository.findAllByUserId(userId)).thenReturn(List.of());

    CreateQuickCaptureTransactionRequest request = quickCaptureRequest();

    assertThatThrownBy(() -> transactionService.createFromQuickCapture(request))
        .isInstanceOf(NoDefaultAccountException.class);

    verify(transactionRepository, never()).save(any());
  }

  @Test
  void quickCaptureFailsClearlyWhenMultipleAccountsExistWithNoPrimary() {
    when(accountRepository.findAllByUserId(userId))
        .thenReturn(List.of(account(true, false), account(true, false)));

    CreateQuickCaptureTransactionRequest request = quickCaptureRequest();

    assertThatThrownBy(() -> transactionService.createFromQuickCapture(request))
        .isInstanceOf(NoDefaultAccountException.class);

    verify(transactionRepository, never()).save(any());
  }

  @Test
  void quickCaptureUsesThePrimaryAccountWhenMultipleAccountsExist() {
    Account nonPrimary = account(true, false);
    Account primary = account(true, true);

    when(accountRepository.findAllByUserId(userId)).thenReturn(List.of(nonPrimary, primary));

    CreateQuickCaptureTransactionRequest request = quickCaptureRequest();

    TransactionResponse response = transactionService.createFromQuickCapture(request);

    assertThat(response.getAccountId()).isEqualTo(primary.getId());
  }

  @Test
  void quickCaptureIgnoresInactiveAccountsWhenPickingTheOnlyAccount() {
    Account inactive = account(false, false);
    Account active = account(true, false);

    when(accountRepository.findAllByUserId(userId)).thenReturn(List.of(inactive, active));

    CreateQuickCaptureTransactionRequest request = quickCaptureRequest();

    TransactionResponse response = transactionService.createFromQuickCapture(request);

    assertThat(response.getAccountId()).isEqualTo(active.getId());
  }

  @Test
  void quickCaptureRunsThroughTheSameCategorizationAndBudgetPipelineAsAManualEntry() {
    Account onlyAccount = account(true, false);
    UUID categoryId = UUID.randomUUID();

    when(accountRepository.findAllByUserId(userId)).thenReturn(List.of(onlyAccount));
    when(categorizationService.categorize(any(Transaction.class))).thenReturn(Optional.of(categoryId));

    CreateQuickCaptureTransactionRequest request = quickCaptureRequest();

    transactionService.createFromQuickCapture(request);

    ArgumentCaptor<Transaction> savedTransaction = ArgumentCaptor.forClass(Transaction.class);
    verify(transactionRepository).save(savedTransaction.capture());

    assertThat(savedTransaction.getValue().getCategoryId()).isEqualTo(categoryId);
    // The budget it counts toward is re-checked, and the balance is recomputed from the ledger.
    verify(budgetSpendService).evaluate(savedTransaction.getValue());
    verify(accountBalanceService).refresh(onlyAccount.getId());
  }

  @Test
  void aTransferMovesTwoLegsBetweenTwoAccountsAndTouchesNoBudget() {
    Account from = account(true, false);
    Account to = account(true, false);
    from.setAccountName("HDFC Savings");
    to.setAccountName("HDFC Regalia");
    when(accountRepository.findByIdAndUserId(from.getId(), userId)).thenReturn(Optional.of(from));
    when(accountRepository.findByIdAndUserId(to.getId(), userId)).thenReturn(Optional.of(to));
    when(transactionRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

    CreateTransferRequest request = new CreateTransferRequest();
    setField(request, "fromAccountId", from.getId());
    setField(request, "toAccountId", to.getId());
    setField(request, "amount", new BigDecimal("12500"));
    setField(request, "transactionDate", java.time.Instant.parse("2026-09-30T00:00:00Z"));

    List<TransactionResponse> legs = transactionService.createTransfer(authFor(userId), request);

    assertThat(legs).hasSize(2);
    assertThat(legs).allSatisfy(leg -> assertThat(leg.isTransfer()).isTrue());
    TransactionResponse out = legs.stream().filter(l -> l.getType() == TransactionType.DEBIT).findFirst().orElseThrow();
    TransactionResponse in = legs.stream().filter(l -> l.getType() == TransactionType.CREDIT).findFirst().orElseThrow();
    assertThat(out.getAccountId()).isEqualTo(from.getId());
    assertThat(out.getDescription()).isEqualTo("Transfer to HDFC Regalia");
    assertThat(in.getAccountId()).isEqualTo(to.getId());
    verify(accountBalanceService).refreshAll(List.of(from.getId(), to.getId()));
    verify(budgetSpendService, never()).evaluate(any(Transaction.class));
  }

  @Test
  void aTransferToTheSameAccountIsRejected() {
    UUID same = UUID.randomUUID();
    CreateTransferRequest request = new CreateTransferRequest();
    setField(request, "fromAccountId", same);
    setField(request, "toAccountId", same);
    setField(request, "amount", new BigDecimal("100"));
    setField(request, "transactionDate", java.time.Instant.now());

    assertThatThrownBy(() -> transactionService.createTransfer(authFor(userId), request))
        .isInstanceOf(com.lifeos.finance_tracker.exception.InvalidRequestException.class);
    verify(transactionRepository, never()).saveAll(any());
  }

  @Test
  void deletingOneLegOfATransferRemovesBothAndRefreshesBothAccounts() {
    UUID pair = UUID.randomUUID();
    Transaction out = Transaction.builder().id(UUID.randomUUID()).userId(userId).accountId(UUID.randomUUID()).type(TransactionType.DEBIT).amount(BigDecimal.TEN).isTransfer(true).transferPairId(pair).build();
    Transaction in = Transaction.builder().id(UUID.randomUUID()).userId(userId).accountId(UUID.randomUUID()).type(TransactionType.CREDIT).amount(BigDecimal.TEN).isTransfer(true).transferPairId(pair).build();
    when(transactionRepository.findByIdAndUserId(out.getId(), userId)).thenReturn(Optional.of(out));
    when(transactionRepository.findAllByTransferPairId(pair)).thenReturn(List.of(out, in));

    transactionService.delete(authFor(userId), out.getId());

    verify(transactionRepository).deleteAll(List.of(out, in));
    verify(accountBalanceService).refreshAll(List.of(out.getAccountId(), in.getAccountId()));
  }

  @Test
  void mergingADuplicateRecomputesTheBalanceSoItNoLongerCounts() {
    Transaction canonical = Transaction.builder().id(UUID.randomUUID()).userId(userId).accountId(UUID.randomUUID()).type(TransactionType.DEBIT).amount(BigDecimal.TEN).build();
    Transaction duplicate = Transaction.builder().id(UUID.randomUUID()).userId(userId).accountId(canonical.getAccountId()).type(TransactionType.DEBIT).amount(BigDecimal.TEN).build();
    when(transactionRepository.findByIdAndUserId(canonical.getId(), userId)).thenReturn(Optional.of(canonical));
    when(transactionRepository.findAllByIdInAndUserId(List.of(duplicate.getId()), userId)).thenReturn(List.of(duplicate));
    com.lifeos.finance_tracker.domains.dto.request.MergeTransactionsRequest merge = new com.lifeos.finance_tracker.domains.dto.request.MergeTransactionsRequest();
    setField(merge, "duplicateTransactionIds", List.of(duplicate.getId()));

    transactionService.merge(authFor(userId), canonical.getId(), merge);

    assertThat(duplicate.isDuplicate()).isTrue();
    assertThat(duplicate.getDuplicateOf()).isEqualTo(canonical.getId());
    verify(accountBalanceService).refreshAll(List.of(canonical.getAccountId()));
  }

  private org.springframework.security.core.Authentication authFor(UUID id) {
    return new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(id, null, List.of());
  }

  private CreateQuickCaptureTransactionRequest quickCaptureRequest() {
    CreateQuickCaptureTransactionRequest request = new CreateQuickCaptureTransactionRequest();
    setField(request, "userId", userId);
    setField(request, "description", "groceries");
    setField(request, "amount", new BigDecimal("400"));
    setField(request, "type", TransactionType.DEBIT);
    return request;
  }

  private static void setField(Object target, String fieldName, Object value) {
    try {
      Field field = target.getClass().getDeclaredField(fieldName);
      field.setAccessible(true);
      field.set(target, value);
    } catch (ReflectiveOperationException e) {
      throw new RuntimeException(e);
    }
  }

  private static <T> T eq(T value) {
    return org.mockito.ArgumentMatchers.eq(value);
  }

  // ---- card payments are one movement of your own money, not an expense ---------------------

  private com.lifeos.finance_tracker.domains.dto.request.CreateEmailAlertTransactionRequest cardPaymentAlert(Account card) {
    return com.lifeos.finance_tracker.domains.dto.request.CreateEmailAlertTransactionRequest.builder()
        .userId(userId)
        .bankName("HDFC Bank")
        .accountType(com.lifeos.finance_tracker.domains.enums.AccountType.CREDIT_CARD)
        .transactionDate(java.time.Instant.parse("2026-09-30T13:15:00Z"))
        .description("Card payment received")
        .amount(new BigDecimal("15000.00"))
        .type(TransactionType.CREDIT)
        .sourceReference("alert-card-1")
        .build();
  }

  private Account typedAccount(com.lifeos.finance_tracker.domains.enums.AccountType type) {
    return Account.builder().id(UUID.randomUUID()).userId(userId).accountType(type).isActive(true).build();
  }

  private Transaction bankDebit(Account bank) {
    return Transaction.builder()
        .id(UUID.randomUUID()).userId(userId).accountId(bank.getId()).type(TransactionType.DEBIT).amount(new BigDecimal("15000.00"))
        .transactionDate(java.time.Instant.parse("2026-09-30T13:14:00Z")).sourceType(com.lifeos.finance_tracker.domains.enums.SourceType.EMAIL_ALERT).build();
  }

  @Test
  void aCardPaymentAlertIsLinkedToTheBankDebitThatPaidIt() {
    Account card = typedAccount(com.lifeos.finance_tracker.domains.enums.AccountType.CREDIT_CARD);
    Account bank = typedAccount(com.lifeos.finance_tracker.domains.enums.AccountType.SAVINGS);
    Transaction debit = bankDebit(bank);
    when(accountResolver.resolve(any(), any(), any(), any())).thenReturn(Optional.of(card));
    when(merchantService.resolveCorrectedName(any(UUID.class), any(String.class))).thenReturn(Optional.empty());
    when(transactionRepository.existsBySourceReference("alert-card-1")).thenReturn(false);
    when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
      Transaction t = inv.getArgument(0);
      if (t.getId() == null) t.setId(UUID.randomUUID());
      return t;
    });
    when(accountRepository.findById(card.getId())).thenReturn(Optional.of(card));
    when(accountRepository.findById(bank.getId())).thenReturn(Optional.of(bank));
    when(transactionRepository.findAllByUserIdAndAmountAndTypeAndAccountIdNotAndIsTransferFalseAndIsDuplicateFalseAndTransactionDateBetween(
            eq(userId), eq(new BigDecimal("15000.00")), eq(TransactionType.DEBIT), eq(card.getId()), any(), any()))
        .thenReturn(List.of(debit));

    transactionService.createFromEmailAlert(cardPaymentAlert(card));

    assertThat(debit.isTransfer()).isTrue();
    assertThat(debit.getTransferPairId()).isNotNull();
    ArgumentCaptor<List<Transaction>> legs = ArgumentCaptor.forClass(List.class);
    verify(transactionRepository).saveAll(legs.capture());
    assertThat(legs.getValue()).hasSize(2).allSatisfy(leg -> {
      assertThat(leg.isTransfer()).isTrue();
      assertThat(leg.getTransferPairId()).isEqualTo(debit.getTransferPairId());
    });
    verify(accountBalanceService).refresh(bank.getId());
  }

  @Test
  void twoPossibleBankDebitsMeansNoGuessing() {
    Account card = typedAccount(com.lifeos.finance_tracker.domains.enums.AccountType.CREDIT_CARD);
    Account bankA = typedAccount(com.lifeos.finance_tracker.domains.enums.AccountType.SAVINGS);
    Account bankB = typedAccount(com.lifeos.finance_tracker.domains.enums.AccountType.CHECKING);
    when(accountResolver.resolve(any(), any(), any(), any())).thenReturn(Optional.of(card));
    when(merchantService.resolveCorrectedName(any(UUID.class), any(String.class))).thenReturn(Optional.empty());
    when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
      Transaction t = inv.getArgument(0);
      if (t.getId() == null) t.setId(UUID.randomUUID());
      return t;
    });
    when(accountRepository.findById(card.getId())).thenReturn(Optional.of(card));
    when(accountRepository.findById(bankA.getId())).thenReturn(Optional.of(bankA));
    when(accountRepository.findById(bankB.getId())).thenReturn(Optional.of(bankB));
    when(transactionRepository.findAllByUserIdAndAmountAndTypeAndAccountIdNotAndIsTransferFalseAndIsDuplicateFalseAndTransactionDateBetween(any(), any(), any(), any(), any(), any()))
        .thenReturn(List.of(bankDebit(bankA), bankDebit(bankB)));

    transactionService.createFromEmailAlert(cardPaymentAlert(card));

    verify(transactionRepository, never()).saveAll(any());
  }
}
