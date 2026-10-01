package com.lifeos.finance_tracker.exception;

import java.util.UUID;

public class SubscriptionNotFoundException extends RuntimeException {

  public SubscriptionNotFoundException(UUID id) {
    super("Subscription with id: " + id + " was not found");
  }
}
