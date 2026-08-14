package com.lifeos.notes.exception;

import java.util.UUID;

public class NoteTemplateNotFoundException extends RuntimeException {

  public NoteTemplateNotFoundException(UUID id) {
    super("Template with id: " + id + " was not found");
  }
}
