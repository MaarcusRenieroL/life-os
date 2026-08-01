package com.lifeos.vault.exception;

public class InvalidMasterPasswordException extends RuntimeException {
  public InvalidMasterPasswordException() {
    super("Invalid master password");
  }
}
