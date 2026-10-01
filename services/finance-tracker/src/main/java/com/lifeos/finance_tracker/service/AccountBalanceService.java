package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * An account's balance is derived: its opening balance plus the net of its counted transactions.
 * Every change to a transaction ends with a refresh from the database, rather than nudging a stored
 * number up and down, so the balance can't drift when a transaction is deleted, edited twice,
 * merged as a duplicate, ignored or imported twice.
 */
@Service
@RequiredArgsConstructor
public class AccountBalanceService {

  private final AccountRepository accountRepository;
  private final TransactionRepository transactionRepository;

  /** Recomputes and stores the balance of one account; returns it, or null if the account is gone. */
  public BigDecimal refresh(UUID accountId) {
    return accountRepository.findById(accountId).map(this::refresh).orElse(null);
  }

  public BigDecimal refresh(Account account) {
    BigDecimal opening = account.getOpeningBalance() == null ? BigDecimal.ZERO : account.getOpeningBalance();
    BigDecimal balance = opening.add(transactionRepository.netForAccount(account.getId()));
    account.setCurrentBalance(balance);
    accountRepository.save(account);
    return balance;
  }

  public void refreshAll(Collection<UUID> accountIds) {
    accountIds.stream().distinct().forEach(this::refresh);
  }

  /**
   * Chooses the opening balance so the derived balance equals {@code target} - used when the user
   * states what the account really holds (reconciling against a statement, or editing the balance).
   */
  public BigDecimal alignTo(Account account, BigDecimal target) {
    account.setOpeningBalance(target.subtract(transactionRepository.netForAccount(account.getId())));
    return refresh(account);
  }
}
