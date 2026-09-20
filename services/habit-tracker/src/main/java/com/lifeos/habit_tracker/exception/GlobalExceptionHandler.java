package com.lifeos.habit_tracker.exception;

import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(exception.getMessage()));
  }

  /**
   * Last-resort net for the find-then-insert races in HabitLogService.upsert/StreakService.
   * recompute (both retry once on this already - see those classes) - a second concurrent
   * collision within the retry window is rare enough to surface as "try again" rather than crash
   * the request with an unmapped 500.
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleConflict(DataIntegrityViolationException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error("That change conflicted with another update - please try again."));
  }

  @ExceptionHandler({InvalidRequestException.class, IllegalArgumentException.class})
  public ResponseEntity<ApiResponse<Void>> handleInvalid(RuntimeException exception) {
    return ResponseEntity.badRequest().body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(Collectors.joining(", "));

    return ResponseEntity.badRequest().body(ApiResponse.error(message));
  }
}
