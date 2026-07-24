package com.lifeos.finance_tracker.exception;

import java.util.UUID;

public class AccountNotFoundException extends RuntimeException {

  public AccountNotFoundException(UUID id) {
    super("Account with id: " + id + " was not found");
  }
}
