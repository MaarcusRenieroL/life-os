package com.lifeos.finance_tracker.exception;

import com.lifeos.finance_tracker.domains.enums.AccountType;
import java.util.UUID;

public class AccountNotFoundException extends RuntimeException {

  public AccountNotFoundException(UUID id) {
    super("Account with id: " + id + " was not found");
  }

  public AccountNotFoundException(String bankName, AccountType accountType) {
    super("No " + accountType + " account found for bank: " + bankName + " (no account matches that bank and type, or more than one does)");
  }
}
