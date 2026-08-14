package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.request.UpdateNoteSettingsRequest;
import com.lifeos.core.domains.dto.response.NoteSettingsResponse;
import com.lifeos.core.service.NoteSettingsService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/notes/settings")
@RequiredArgsConstructor
public class NoteSettingsController {

  private final NoteSettingsService noteSettingsService;

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

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
