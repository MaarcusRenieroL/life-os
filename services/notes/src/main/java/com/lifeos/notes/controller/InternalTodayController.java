package com.lifeos.notes.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.notes.domains.dto.response.NoteResponse;
import com.lifeos.notes.service.NoteService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Called by core (the cross-module Today aggregator, and quick-capture) via the internal API
// key, not by end users - see SecurityConfig's INTERNAL_SERVICE matcher for this prefix. userId
// is a request param/body field (rather than the usual Authentication principal) since internal
// service-to-service calls carry no JWT auth context - same pattern as the other modules'
// internal controllers.
@RestController
@RequestMapping("/v1/notes/internal")
@RequiredArgsConstructor
public class InternalTodayController {

  private final NoteService noteService;

  @GetMapping("/today")
  public ResponseEntity<ApiResponse<List<TodayItemResponse>>> today(
      @RequestParam UUID userId) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.todayFollowUps(userId), "Today items fetched successfully"));
  }

  /** Backs core's quick-capture flow - a title+body pair straight from an AI classification of
   * free text the user typed, no folder/tags/module-links (those are all editable afterward from
   * the normal note editor, quick-capture is deliberately just "get it captured, fast"). */
  @PostMapping("/quick-note")
  public ResponseEntity<ApiResponse<NoteResponse>> quickNote(@RequestBody Map<String, String> request) {
    UUID userId = UUID.fromString(request.get("userId"));
    NoteResponse note = noteService.createFromTemplate(userId, request.get("title"), request.get("body"));

    return ResponseEntity.ok(ApiResponse.success(note, "Note captured successfully"));
  }
}
