package com.lifeos.core.exception;

// Generic 409 for note-module conflicts - duplicate folder name, duplicate
// link, non-empty folder deletion.
public class NoteConflictException extends RuntimeException {

  public NoteConflictException(String message) {
    super(message);
  }
}
