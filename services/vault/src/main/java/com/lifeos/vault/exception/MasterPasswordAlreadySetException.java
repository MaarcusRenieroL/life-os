package com.lifeos.vault.exception;

public class MasterPasswordAlreadySetException extends RuntimeException {
  public MasterPasswordAlreadySetException() {
    super("Master password is already set for this account");
  }
}
