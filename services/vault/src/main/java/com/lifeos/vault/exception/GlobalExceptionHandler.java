package com.lifeos.vault.exception;

import com.lifeos.vault.domains.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(VaultEntryNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleVaultEntryNotFound(
      VaultEntryNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(InvalidMasterPasswordException.class)
  public ResponseEntity<ApiResponse<Void>> handleInvalidMasterPassword(
      InvalidMasterPasswordException exception) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(VaultLockedException.class)
  public ResponseEntity<ApiResponse<Void>> handleVaultLocked(VaultLockedException exception) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(MasterPasswordAlreadySetException.class)
  public ResponseEntity<ApiResponse<Void>> handleMasterPasswordAlreadySet(
      MasterPasswordAlreadySetException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(exception.getMessage()));
  }
}
