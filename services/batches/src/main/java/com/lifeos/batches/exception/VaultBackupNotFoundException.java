package com.lifeos.batches.exception;

import java.util.UUID;

public class VaultBackupNotFoundException extends RuntimeException {

  public VaultBackupNotFoundException(UUID id) {
    super("Vault backup for the id: " + id + " was not found");
  }
}
