package com.lifeos.auth.exception;

import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(ApiResponse.error(message));
  }

  @ExceptionHandler(EmailAlreadyExistsException.class)
  public ResponseEntity<ApiResponse<Void>> handleEmailAlreadyExists(
      EmailAlreadyExistsException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(RegistrationClosedException.class)
  public ResponseEntity<ApiResponse<Void>> handleRegistrationClosed(RegistrationClosedException exception) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(exception.getMessage()));
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

  @ExceptionHandler(InvalidAvatarException.class)
  public ResponseEntity<ApiResponse<Void>> handleInvalidAvatar(InvalidAvatarException exception) {
    return ResponseEntity.badRequest().body(ApiResponse.error(exception.getMessage()));
  }
}
