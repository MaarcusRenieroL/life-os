package com.lifeos.job_tracker.exception;

public class ResumeNotFoundException extends RuntimeException {

  public ResumeNotFoundException() {
    super("No active resume found");
  }
}
