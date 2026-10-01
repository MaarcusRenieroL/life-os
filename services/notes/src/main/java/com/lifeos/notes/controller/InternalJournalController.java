package com.lifeos.notes.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.notes.domains.dto.response.JournalInsightsResponse;
import com.lifeos.notes.service.JournalService;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Mood/energy per day for core's analytics, via the internal API key (userId as a request param
// since internal calls carry no JWT).
@RestController
@RequestMapping("/v1/notes/internal")
@RequiredArgsConstructor
public class InternalJournalController {

  private final JournalService journalService;

  @GetMapping("/journal-daily")
  public ResponseEntity<ApiResponse<JournalInsightsResponse>> journalDaily(
      @RequestParam UUID userId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    return ResponseEntity.ok(ApiResponse.success(journalService.insights(userId, from, to), "Journal stats fetched"));
  }
}
