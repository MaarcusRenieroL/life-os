package com.lifeos.vault.exception;

public class VaultLockedException extends RuntimeException {
  public VaultLockedException() {
    super("Vault is locked - verify your master password first");
  }
}
