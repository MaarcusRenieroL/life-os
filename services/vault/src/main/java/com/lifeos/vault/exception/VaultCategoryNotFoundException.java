package com.lifeos.vault.exception;

import java.util.UUID;

public class VaultCategoryNotFoundException extends RuntimeException {

  public VaultCategoryNotFoundException(UUID id) {
    super("Vault Category with id: " + id + " was not found");
  }
}
