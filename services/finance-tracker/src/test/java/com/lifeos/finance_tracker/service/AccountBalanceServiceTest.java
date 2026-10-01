package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountBalanceServiceTest {

  @Mock private AccountRepository accountRepository;
  @Mock private TransactionRepository transactionRepository;
  @InjectMocks private AccountBalanceService service;

  private Account account(String opening, String staleBalance) {
    return Account.builder().id(UUID.randomUUID()).openingBalance(new BigDecimal(opening)).currentBalance(new BigDecimal(staleBalance)).build();
  }

  @Test
  void theBalanceIsTheOpeningBalancePlusTheLedgerNetNotWhateverWasStored() {
    Account account = account("10000.00", "999999.00");
    when(transactionRepository.netForAccount(account.getId())).thenReturn(new BigDecimal("-2500.50"));

    BigDecimal balance = service.refresh(account);

    assertThat(balance).isEqualByComparingTo("7499.50");
    assertThat(account.getCurrentBalance()).isEqualByComparingTo("7499.50");
    verify(accountRepository).save(account);
  }

  @Test
  void anEmptyLedgerLeavesJustTheOpeningBalance() {
    Account account = account("500", "0");
    when(transactionRepository.netForAccount(account.getId())).thenReturn(BigDecimal.ZERO);

    assertThat(service.refresh(account)).isEqualByComparingTo("500");
  }

  @Test
  void anAccountWithNoOpeningBalanceCountsAsZero() {
    Account account = Account.builder().id(UUID.randomUUID()).build();
    when(transactionRepository.netForAccount(account.getId())).thenReturn(new BigDecimal("125000"));

    assertThat(service.refresh(account)).isEqualByComparingTo("125000");
  }

  @Test
  void statingTheBalanceMovesTheOpeningBalanceSoTheBooksAgree() {
    Account account = account("0", "0");
    when(transactionRepository.netForAccount(account.getId())).thenReturn(new BigDecimal("-3000"));

    BigDecimal balance = service.alignTo(account, new BigDecimal("184250.50"));

    assertThat(balance).isEqualByComparingTo("184250.50");
    // 184,250.50 stated = opening + (-3,000) net  =>  opening 187,250.50
    assertThat(account.getOpeningBalance()).isEqualByComparingTo("187250.50");
  }

  @Test
  void refreshingAnUnknownAccountIsANoOp() {
    UUID missing = UUID.randomUUID();
    when(accountRepository.findById(missing)).thenReturn(Optional.empty());

    assertThat(service.refresh(missing)).isNull();
  }
}
