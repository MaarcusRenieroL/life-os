package com.lifeos.finance_tracker.exception;

import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(AccountNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleAccountNotFound(
      AccountNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(TransactionNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleTransactionNotFound(
      TransactionNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(exception.getMessage()));
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
