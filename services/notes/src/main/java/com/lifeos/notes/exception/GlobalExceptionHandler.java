package com.lifeos.notes.exception;

import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(NoteNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleNoteNotFound(NoteNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(NoteFolderNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleFolderNotFound(
      NoteFolderNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(TagNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleTagNotFound(TagNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(NoteTemplateNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleTemplateNotFound(
      NoteTemplateNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(NoteAttachmentNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleAttachmentNotFound(
      NoteAttachmentNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(NoteValidationException.class)
  public ResponseEntity<ApiResponse<Void>> handleNoteValidation(NoteValidationException exception) {
    return ResponseEntity.badRequest().body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler(NoteConflictException.class)
  public ResponseEntity<ApiResponse<Void>> handleNoteConflict(NoteConflictException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(exception.getMessage()));
  }

  @ExceptionHandler({AttachmentTooLargeException.class, MaxUploadSizeExceededException.class})
  public ResponseEntity<ApiResponse<Void>> handleAttachmentTooLarge(Exception exception) {
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
        .body(ApiResponse.error("File is too large (max 50MB)"));
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
