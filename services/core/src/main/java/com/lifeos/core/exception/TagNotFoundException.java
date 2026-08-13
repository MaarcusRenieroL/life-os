package com.lifeos.core.exception;

import java.util.UUID;

public class TagNotFoundException extends RuntimeException {

  public TagNotFoundException(UUID id) {
    super("Tag with id: " + id + " was not found");
  }
}
