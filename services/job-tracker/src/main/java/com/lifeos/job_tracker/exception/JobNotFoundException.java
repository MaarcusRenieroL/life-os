package com.lifeos.job_tracker.exception;

import java.util.UUID;

public class JobNotFoundException extends RuntimeException {

  public JobNotFoundException(UUID id) {
    super("Job with id: " + id + " was not found");
  }
}
