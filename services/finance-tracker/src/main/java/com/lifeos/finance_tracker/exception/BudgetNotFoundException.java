package com.lifeos.finance_tracker.exception;

import java.util.UUID;

public class BudgetNotFoundException extends RuntimeException {

  public BudgetNotFoundException(UUID id) {
    super("Budget with id: " + id + " was not found");
  }
}
