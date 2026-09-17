package com.lifeos.finance_tracker.exception;

import java.util.UUID;

public class CategoryNotFoundException extends RuntimeException {

  public CategoryNotFoundException(UUID id) {
    super("Category with id: " + id + " was not found");
  }
}
