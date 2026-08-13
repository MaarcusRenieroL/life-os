package com.lifeos.core.exception;

import java.util.UUID;

public class NoteFolderNotFoundException extends RuntimeException {

  public NoteFolderNotFoundException(UUID id) {
    super("Folder with id: " + id + " was not found");
  }
}
