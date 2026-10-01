package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CreateAccountRequest;
import com.lifeos.finance_tracker.domains.dto.request.ReconcileAccountRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateAccountRequest;
import com.lifeos.finance_tracker.domains.dto.response.AccountResponse;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.exception.AccountNotFoundException;
import com.lifeos.finance_tracker.repository.AccountRepository;
import com.lifeos.common.security.EncryptionService;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class AccountService {

  private final AccountRepository accountRepository;
  private final EncryptionService encryptionService;
  private final AccountBalanceService accountBalanceService;
  private final ImportFailureService importFailureService;
  private final com.lifeos.finance_tracker.repository.TransactionRepository transactionRepository;

  @Transactional(readOnly = true)
  public List<AccountResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return accountRepository.findAllByUserId(userId).stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public AccountResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toResponse(
        accountRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new AccountNotFoundException(id)));
  }

  public AccountResponse save(Authentication authentication, CreateAccountRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Account account =
        Account.builder()
            .userId(userId)
            .accountName(request.getAccountName())
            .accountType(request.getAccountType())
            .bankName(request.getBankName())
            .accountNumberEncrypted(encryptionService.encrypt(request.getAccountNumber()))
            .currencyCode(request.getCurrencyCode())
            .openedDate(request.getOpenedDate())
            // What the account holds today is its opening balance: transactions recorded from here
            // on are added to it, and the balance is always opening + net of transactions.
            .openingBalance(request.getCurrentBalance() != null ? request.getCurrentBalance() : BigDecimal.ZERO)
            .currentBalance(
                request.getCurrentBalance() != null ? request.getCurrentBalance() : BigDecimal.ZERO)
            .isActive(true)
            .isPrimary(request.isPrimary())
            .emailForAlerts(request.getEmailForAlerts())
            .notes(request.getNotes())
            .build();

    Account created = accountRepository.save(account);
    // Bank alerts that arrived before this account existed were kept; they can be booked now.
    importFailureService.retryWaiting(userId);
    return toResponse(created);
  }

  public AccountResponse update(Authentication authentication, UUID id, UpdateAccountRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Account account =
        accountRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new AccountNotFoundException(id));

    if (StringUtils.hasText(request.getAccountName())) {
      account.setAccountName(request.getAccountName());
    }

    if (request.getAccountType() != null) {
      account.setAccountType(request.getAccountType());
    }

    if (StringUtils.hasText(request.getBankName())) {
      account.setBankName(request.getBankName());
    }

    if (StringUtils.hasText(request.getAccountNumber())) {
      account.setAccountNumberEncrypted(encryptionService.encrypt(request.getAccountNumber()));
    }

    if (request.getCurrencyCode() != null) {
      account.setCurrencyCode(request.getCurrencyCode());
    }

    if (request.getOpenedDate() != null) {
      account.setOpenedDate(request.getOpenedDate());
    }

    // Typing a new balance means "this is what it holds now": the opening balance moves so the
    // derived balance equals it, instead of overwriting a number that the next transaction would
    // silently throw away.
    BigDecimal statedBalance = request.getCurrentBalance();

    if (request.getIsActive() != null) {
      account.setActive(request.getIsActive());
    }

    if (request.getIsPrimary() != null) {
      account.setPrimary(request.getIsPrimary());
    }

    if (StringUtils.hasText(request.getEmailForAlerts())) {
      account.setEmailForAlerts(request.getEmailForAlerts());
    }

    if (request.getNotes() != null) {
      account.setNotes(request.getNotes());
    }

    Account saved = accountRepository.save(account);
    if (statedBalance != null) {
      accountBalanceService.alignTo(saved, statedBalance);
    }
    return toResponse(saved);
  }

  /**
   * Deletes an account. One that has transactions is refused unless {@code withTransactions} is set:
   * the database keeps them tied to the account, so a bare delete used to fail with a raw foreign-key
   * error, and silently dropping the history would be worse. With the flag, its transactions go too.
   */
  public void delete(Authentication authentication, UUID id, boolean withTransactions) {
    UUID userId = (UUID) authentication.getPrincipal();

    accountRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new AccountNotFoundException(id));

    long count = transactionRepository.countByAccountId(id);
    if (count > 0) {
      if (!withTransactions) {
        throw new com.lifeos.finance_tracker.exception.InvalidRequestException(
            "This account has " + count + " transaction" + (count == 1 ? "" : "s")
                + ". Delete the account together with its transactions, or keep it.");
      }
      transactionRepository.clearDuplicateLinksInto(id);
      transactionRepository.deleteAllByAccountId(id);
    }

    accountRepository.deleteByIdAndUserId(id, userId);
  }

  // Simple reconciliation: sync the ledger balance to the statement balance.
  // Discrepancy detection (missing/extra transactions) is a Phase 3 concern
  // once statement import exists to compare against.
  public AccountResponse reconcile(
      Authentication authentication, UUID id, ReconcileAccountRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Account account =
        accountRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new AccountNotFoundException(id));

    // The statement is the truth: pick the opening balance so the books agree with it.
    accountBalanceService.alignTo(account, request.getStatementBalance());

    return toResponse(account);
  }

  /** Recomputes the balance from the ledger - for an account whose number looks off. */
  public AccountResponse recalculate(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    Account account =
        accountRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new AccountNotFoundException(id));

    accountBalanceService.refresh(account);
    return toResponse(account);
  }

  private AccountResponse toResponse(Account account) {
    String lastFour = "----";
    if (account.getAccountNumberEncrypted() != null) {
      String accountNumber = encryptionService.decrypt(account.getAccountNumberEncrypted());
      lastFour = accountNumber.substring(Math.max(0, accountNumber.length() - 4));
    }

    return AccountResponse.builder()
        .id(account.getId())
        .accountName(account.getAccountName())
        .accountType(account.getAccountType())
        .bankName(account.getBankName())
        .accountNumberLastFour(lastFour)
        .currencyCode(account.getCurrencyCode())
        .openedDate(account.getOpenedDate())
        .currentBalance(account.getCurrentBalance())
        .openingBalance(account.getOpeningBalance())
        .transactionCount(transactionRepository.countByAccountId(account.getId()))
        .isActive(account.isActive())
        .isPrimary(account.isPrimary())
        .emailForAlerts(account.getEmailForAlerts())
        .notes(account.getNotes())
        .createdAt(account.getCreatedAt())
        .updatedAt(account.getUpdatedAt())
        .build();
  }
}
