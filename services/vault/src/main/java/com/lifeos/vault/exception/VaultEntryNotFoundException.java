package com.lifeos.vault.exception;

import java.util.UUID;

public class VaultEntryNotFoundException extends RuntimeException {

  public VaultEntryNotFoundException(UUID id) {
    super("Vault Entry with id: " + id + " was not found");
  }
}
