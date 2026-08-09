package com.lifeos.job_tracker.exception;

import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApplicationNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleApplicationNotFound(
      ApplicationNotFoundException exception) {
    log.warn("Application not found: {}", exception.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(JobNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleJobNotFound(JobNotFoundException exception) {
    log.warn("Job not found: {}", exception.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(ResumeNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleResumeNotFound(ResumeNotFoundException exception) {
    log.warn("Resume not found: {}", exception.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(NotificationNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleNotificationNotFound(
      NotificationNotFoundException exception) {
    log.warn("Notification not found: {}", exception.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(Collectors.joining(", "));

    log.warn("Validation failed: {}", message);
    return ResponseEntity.badRequest().body(ApiResponse.error(message));
  }

  // Catch-all for anything not explicitly handled above (DB errors, downstream
  // service failures, unexpected NPEs, etc.) so clients always get the same
  // ApiResponse shape back instead of a raw Spring error page / stack trace,
  // while the real cause still lands in the logs for debugging.
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception exception) {
    log.error("Unhandled exception in job-tracker", exception);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.error("Something went wrong. Please try again."));
  }
}
