package com.lifeos.notes.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.notes.domains.dto.request.SaveJournalEntryRequest;
import com.lifeos.notes.domains.dto.response.JournalEntryResponse;
import com.lifeos.notes.domains.dto.response.JournalInsightsResponse;
import com.lifeos.notes.domains.dto.response.JournalPromptResponse;
import com.lifeos.notes.service.JournalPrompts;
import com.lifeos.notes.service.JournalService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/notes/journal")
@RequiredArgsConstructor
public class JournalController {

  private final JournalService journalService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<JournalEntryResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) Integer mood,
      @RequestParam(required = false) String q) {
    return ResponseEntity.ok(ApiResponse.success(journalService.list(userId(authentication), from, to, mood, q), "Journal entries fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<JournalEntryResponse>> create(
      Authentication authentication, @Valid @RequestBody SaveJournalEntryRequest request) {
    return ResponseEntity.ok(ApiResponse.success(journalService.create(userId(authentication), request), "Journal entry created successfully"));
  }

  @GetMapping("/prompts")
  public ResponseEntity<ApiResponse<List<JournalPromptResponse>>> prompts() {
    return ResponseEntity.ok(ApiResponse.success(JournalPrompts.ALL, "Journal prompts fetched successfully"));
  }

  @GetMapping("/prompts/suggested")
  public ResponseEntity<ApiResponse<List<JournalPromptResponse>>> suggestedPrompts(@RequestParam(required = false) LocalDate date) {
    return ResponseEntity.ok(ApiResponse.success(JournalPrompts.suggestedFor(date == null ? LocalDate.now() : date), "Suggested prompts fetched successfully"));
  }

  @GetMapping("/insights")
  public ResponseEntity<ApiResponse<JournalInsightsResponse>> insights(
      Authentication authentication, @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to) {
    return ResponseEntity.ok(ApiResponse.success(journalService.insights(userId(authentication), from, to), "Journal insights fetched successfully"));
  }

  @GetMapping("/{noteId}")
  public ResponseEntity<ApiResponse<JournalEntryResponse>> get(Authentication authentication, @PathVariable UUID noteId) {
    return ResponseEntity.ok(ApiResponse.success(journalService.get(userId(authentication), noteId), "Journal entry fetched successfully"));
  }

  @PutMapping("/{noteId}")
  public ResponseEntity<ApiResponse<JournalEntryResponse>> update(
      Authentication authentication, @PathVariable UUID noteId, @Valid @RequestBody SaveJournalEntryRequest request) {
    return ResponseEntity.ok(ApiResponse.success(journalService.update(userId(authentication), noteId, request), "Journal entry updated successfully"));
  }

  @DeleteMapping("/{noteId}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID noteId) {
    journalService.delete(userId(authentication), noteId);
    return ResponseEntity.ok(ApiResponse.success(null, "Journal entry moved to trash"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
