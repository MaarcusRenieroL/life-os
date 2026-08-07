package com.lifeos.job_tracker.exception;

import java.util.UUID;

public class NotificationNotFoundException extends RuntimeException {

  public NotificationNotFoundException(UUID id) {
    super("Notification with id: " + id + " was not found");
  }
}
