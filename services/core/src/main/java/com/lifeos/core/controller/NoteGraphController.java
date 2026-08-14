package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.response.NoteGraphResponse;
import com.lifeos.core.service.NoteGraphService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/notes/graph")
@RequiredArgsConstructor
public class NoteGraphController {

  private final NoteGraphService noteGraphService;

  @GetMapping
  public ResponseEntity<ApiResponse<NoteGraphResponse>> get(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    return ResponseEntity.ok(ApiResponse.success(noteGraphService.build(userId), "Graph fetched successfully"));
  }
}
