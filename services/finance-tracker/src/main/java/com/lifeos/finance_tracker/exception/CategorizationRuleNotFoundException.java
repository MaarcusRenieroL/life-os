package com.lifeos.finance_tracker.exception;

import java.util.UUID;

public class CategorizationRuleNotFoundException extends RuntimeException {

  public CategorizationRuleNotFoundException(UUID id) {
    super("Categorization rule with id: " + id + " was not found");
  }
}
