package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.request.UpdateNoteSettingsRequest;
import com.lifeos.core.domains.dto.response.NoteSettingsResponse;
import com.lifeos.core.service.NoteExportService;
import com.lifeos.core.service.NoteSettingsService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/notes/settings")
@RequiredArgsConstructor
public class NoteSettingsController {

  private final NoteSettingsService noteSettingsService;
  private final NoteExportService noteExportService;

  @GetMapping
  public ResponseEntity<ApiResponse<NoteSettingsResponse>> get(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(noteSettingsService.get(userId(authentication)), "Settings fetched successfully"));
  }

  @PutMapping
  public ResponseEntity<ApiResponse<NoteSettingsResponse>> update(
      Authentication authentication, @Valid @RequestBody UpdateNoteSettingsRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteSettingsService.update(userId(authentication), request), "Settings updated successfully"));
  }

  @GetMapping("/export-all")
  public ResponseEntity<byte[]> exportAll(
      Authentication authentication, @RequestParam(defaultValue = "markdown") String format) {
    NoteExportService.ExportFile file = noteExportService.exportAll(userId(authentication), format);

    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(file.fileName()).build().toString())
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.content());
  }

  @DeleteMapping("/all-data")
  public ResponseEntity<ApiResponse<Void>> deleteAllData(
      Authentication authentication, @RequestParam(defaultValue = "false") boolean confirm) {
    if (!confirm) {
      return ResponseEntity.badRequest()
          .body(ApiResponse.error("Pass confirm=true to permanently delete all notes data"));
    }

    noteSettingsService.deleteAllUserData(userId(authentication));
    return ResponseEntity.ok(ApiResponse.success(null, "All notes data deleted"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
