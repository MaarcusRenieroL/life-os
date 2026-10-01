package com.lifeos.habit_tracker.exception;

public class ResourceNotFoundException extends RuntimeException {

  public ResourceNotFoundException(String message) {
    super(message);
  }

  public static ResourceNotFoundException of(String resource, Object id) {
    return new ResourceNotFoundException(resource + " " + id + " not found");
  }
}
