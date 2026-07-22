package com.lifeos.vault.exception;

import java.util.UUID;

public class VaultMasterPasswordNotFoundException extends RuntimeException {

  public VaultMasterPasswordNotFoundException(UUID id) {
    super("Vault Master Password setup not found for id: " + id);
  }
}
