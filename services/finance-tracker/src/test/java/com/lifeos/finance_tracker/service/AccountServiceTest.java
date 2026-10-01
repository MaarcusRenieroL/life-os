package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.security.EncryptionService;
import com.lifeos.finance_tracker.domains.dto.request.ReconcileAccountRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateAccountRequest;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.exception.InvalidRequestException;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

  @Mock private AccountRepository accountRepository;
  @Mock private EncryptionService encryptionService;
  @Mock private AccountBalanceService accountBalanceService;
  @Mock private ImportFailureService importFailureService;
  @Mock private TransactionRepository transactionRepository;

  private AccountService service;
  private final UUID userId = UUID.randomUUID();
  private final Authentication auth = new UsernamePasswordAuthenticationToken(userId, null, List.of());
  private Account account;

  @BeforeEach
  void setUp() {
    service = new AccountService(accountRepository, encryptionService, accountBalanceService, importFailureService, transactionRepository);
    account = Account.builder().id(UUID.randomUUID()).userId(userId).accountName("HDFC Savings").currentBalance(BigDecimal.ZERO).openingBalance(BigDecimal.ZERO).build();
    when(accountRepository.findByIdAndUserId(account.getId(), userId)).thenReturn(Optional.of(account));
  }

  private static void set(Object target, String name, Object value) {
    try {
      Field field = target.getClass().getDeclaredField(name);
      field.setAccessible(true);
      field.set(target, value);
    } catch (ReflectiveOperationException e) {
      throw new RuntimeException(e);
    }
  }

  @Test
  void anEmptyAccountIsDeletedPlainly() {
    when(transactionRepository.countByAccountId(account.getId())).thenReturn(0L);

    service.delete(auth, account.getId(), false);

    verify(accountRepository).deleteByIdAndUserId(account.getId(), userId);
    verify(transactionRepository, never()).deleteAllByAccountId(any());
  }

  @Test
  void anAccountWithTransactionsIsRefusedWithTheCountInsteadOfAForeignKeyError() {
    when(transactionRepository.countByAccountId(account.getId())).thenReturn(42L);

    assertThatThrownBy(() -> service.delete(auth, account.getId(), false))
        .isInstanceOf(InvalidRequestException.class)
        .hasMessageContaining("42 transactions");
    verify(accountRepository, never()).deleteByIdAndUserId(any(), any());
  }

  @Test
  void confirmingRemovesTheTransactionsFirstThenTheAccount() {
    when(transactionRepository.countByAccountId(account.getId())).thenReturn(3L);

    service.delete(auth, account.getId(), true);

    var order = org.mockito.Mockito.inOrder(transactionRepository, accountRepository);
    order.verify(transactionRepository).clearDuplicateLinksInto(account.getId());
    order.verify(transactionRepository).deleteAllByAccountId(account.getId());
    order.verify(accountRepository).deleteByIdAndUserId(account.getId(), userId);
  }

  @Test
  void reconcilingAlignsTheOpeningBalanceToTheStatement() {
    ReconcileAccountRequest request = new ReconcileAccountRequest();
    set(request, "statementBalance", new BigDecimal("184250.50"));
    set(request, "statementDate", java.time.Instant.now());

    service.reconcile(auth, account.getId(), request);

    verify(accountBalanceService).alignTo(account, new BigDecimal("184250.50"));
  }

  @Test
  void typingANewBalanceOnTheAccountMovesTheOpeningBalanceToo() {
    UpdateAccountRequest request = new UpdateAccountRequest();
    set(request, "currentBalance", new BigDecimal("5000"));
    when(accountRepository.save(account)).thenReturn(account);

    service.update(auth, account.getId(), request);

    verify(accountBalanceService).alignTo(account, new BigDecimal("5000"));
  }

  @Test
  void editingOtherFieldsLeavesTheBalanceAlone() {
    UpdateAccountRequest request = new UpdateAccountRequest();
    set(request, "accountName", "HDFC Salary");
    when(accountRepository.save(account)).thenReturn(account);

    service.update(auth, account.getId(), request);

    assertThat(account.getAccountName()).isEqualTo("HDFC Salary");
    verify(accountBalanceService, never()).alignTo(any(), any());
  }

  @Test
  void recalculateRefreshesFromTheLedger() {
    service.recalculate(auth, account.getId());

    verify(accountBalanceService).refresh(account);
  }
}
