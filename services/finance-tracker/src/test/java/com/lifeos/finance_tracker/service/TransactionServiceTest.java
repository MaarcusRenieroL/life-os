package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.finance_tracker.domains.dto.request.CreateQuickCaptureTransactionRequest;
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
            budgetSpendService);

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
    verify(budgetSpendService)
        .recordSpend(eq(userId), eq(categoryId), eq(new BigDecimal("400")), any());
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
}
