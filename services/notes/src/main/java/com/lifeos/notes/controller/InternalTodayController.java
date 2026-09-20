package com.lifeos.notes.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.notes.service.NoteService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Called by core's cross-module Today aggregator via the internal API key, not by end users -
// see SecurityConfig's INTERNAL_SERVICE matcher for this prefix. userId is a request param
// (rather than the usual Authentication principal) since internal service-to-service calls carry
// no JWT auth context - same pattern as the other modules' internal controllers.
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
}
