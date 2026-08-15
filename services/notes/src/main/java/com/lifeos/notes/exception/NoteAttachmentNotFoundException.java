package com.lifeos.notes.exception;

import java.util.UUID;

public class NoteAttachmentNotFoundException extends RuntimeException {

  public NoteAttachmentNotFoundException(UUID id) {
    super("Attachment with id: " + id + " was not found");
  }
}
