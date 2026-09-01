package com.lifeos.finance_tracker.exception;

import java.util.UUID;

public class MerchantNotFoundException extends RuntimeException {

  public MerchantNotFoundException(UUID id) {
    super("Merchant with id: " + id + " was not found");
  }
}
