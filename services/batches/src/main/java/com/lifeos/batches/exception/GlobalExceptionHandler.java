package com.lifeos.batches.exception;

import com.lifeos.common.domains.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(StatementParseException.class)
  public ResponseEntity<ApiResponse<Void>> handleStatementParse(StatementParseException exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(exception.getMessage()));
  }
}
