package com.lifeos.vault.exception;

public class VaultCategoryAlreadyExistsException extends RuntimeException {

  public VaultCategoryAlreadyExistsException(String name) {
    super("A category named '" + name + "' already exists");
  }
}
