package com.lifeos.auth.exception;

import com.lifeos.common.domains.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(EmailAlreadyExistsException.class)
  public ResponseEntity<ApiResponse<Void>> handleEmailAlreadyExists(
      EmailAlreadyExistsException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(InvalidCredentialsException.class)
  public ResponseEntity<ApiResponse<Void>> handleInvalidCredentials(
      InvalidCredentialsException exception) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(UserNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleUserNotFound(UserNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(BiometricAlreadyEnrolledException.class)
  public ResponseEntity<ApiResponse<Void>> handleBiometricAlreadyEnrolled(
      BiometricAlreadyEnrolledException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(exception.getMessage()));
  }
}
