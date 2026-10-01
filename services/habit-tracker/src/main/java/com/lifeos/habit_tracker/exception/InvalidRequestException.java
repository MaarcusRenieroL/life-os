package com.lifeos.habit_tracker.exception;

public class InvalidRequestException extends RuntimeException {

  public InvalidRequestException(String message) {
    super(message);
  }
}
