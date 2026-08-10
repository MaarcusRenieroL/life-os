package com.lifeos.job_tracker.exception;

import java.util.UUID;

public class InterviewNotFoundException extends RuntimeException {

  public InterviewNotFoundException(UUID id) {
    super("Interview with id: " + id + " was not found");
  }
}
