package com.lifeos.notes.exception;

// Generic 400 for note-module business-rule violations that aren't simple
// bean-validation failures - e.g. "cannot link a note to itself".
public class NoteValidationException extends RuntimeException {

  public NoteValidationException(String message) {
    super(message);
  }
}
