package com.lifeos.finance_tracker.exception;

import java.util.UUID;

public class RecurringPatternNotFoundException extends RuntimeException {

  public RecurringPatternNotFoundException(UUID id) {
    super("Recurring pattern with id: " + id + " was not found");
  }
}
