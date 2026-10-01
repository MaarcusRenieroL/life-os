package com.lifeos.notes.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.notes.domains.enums.NoteModuleType;
import com.lifeos.notes.service.NoteModuleLinkService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Called by other modules via the internal API key when something a note was linked to is deleted. userId is
// a request param because internal calls carry no JWT - same convention as InternalTodayController.
@RestController
@RequestMapping("/v1/notes/internal")
@RequiredArgsConstructor
public class InternalLinkController {

  private final NoteModuleLinkService noteModuleLinkService;

  @DeleteMapping("/module-links/{moduleType}/{moduleId}")
  public ResponseEntity<ApiResponse<Integer>> removeLinks(
      @PathVariable NoteModuleType moduleType, @PathVariable UUID moduleId, @RequestParam UUID userId) {
    return ResponseEntity.ok(ApiResponse.success(noteModuleLinkService.removeAllForModule(userId, moduleType, moduleId), "Note links removed"));
  }
}
