package com.lifeos.batches.exception;

import java.util.UUID;

public class AuditEventNotFoundException extends RuntimeException {

  public AuditEventNotFoundException(UUID id) {
    super("Audit event with the id: " + id + " was not found");
  }
}
