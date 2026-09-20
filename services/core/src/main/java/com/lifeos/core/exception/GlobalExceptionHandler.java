package com.lifeos.core.exception;

import com.lifeos.common.domains.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler({IllegalStateException.class, IllegalArgumentException.class})
  public ResponseEntity<ApiResponse<Void>> handleInvalid(RuntimeException exception) {
    return ResponseEntity.badRequest().body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(AiUnavailableException.class)
  public ResponseEntity<ApiResponse<Void>> handleAiUnavailable(AiUnavailableException exception) {
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(QuickCaptureRoutingException.class)
  public ResponseEntity<ApiResponse<Void>> handleQuickCaptureRouting(QuickCaptureRoutingException exception) {
    return ResponseEntity.unprocessableEntity().body(ApiResponse.error(exception.getMessage()));
  }
}
