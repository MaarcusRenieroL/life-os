package com.lifeos.job_tracker.exception;

import java.util.UUID;

public class ApplicationNotFoundException extends RuntimeException {

  public ApplicationNotFoundException(UUID id) {
    super("Application with id: " + id + " was not found");
  }
}
