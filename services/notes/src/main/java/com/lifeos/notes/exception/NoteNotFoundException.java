package com.lifeos.notes.exception;

import java.util.UUID;

public class NoteNotFoundException extends RuntimeException {

  public NoteNotFoundException(UUID id) {
    super("Note with id: " + id + " was not found");
  }
}
