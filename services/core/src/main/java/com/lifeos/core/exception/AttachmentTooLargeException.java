package com.lifeos.core.exception;

public class AttachmentTooLargeException extends RuntimeException {

  public AttachmentTooLargeException(long maxBytes) {
    super("File is too large (max " + (maxBytes / (1024 * 1024)) + "MB)");
  }
}
