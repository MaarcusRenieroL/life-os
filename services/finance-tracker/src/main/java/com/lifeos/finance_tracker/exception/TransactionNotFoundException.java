package com.lifeos.finance_tracker.exception;

import java.util.UUID;

public class TransactionNotFoundException extends RuntimeException {

  public TransactionNotFoundException(UUID id) {
    super("Transaction with id: " + id + " was not found");
  }
}
