package com.lifeos.vault.exception;

import java.util.UUID;

public class PaymentCardNotFoundException extends RuntimeException {

  public PaymentCardNotFoundException(UUID id) {
    super("Payment card with id: " + id + " was not found");
  }
}
