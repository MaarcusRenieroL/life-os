package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.response.RecentSearchResponse;
import com.lifeos.core.domains.dto.response.SearchResultResponse;
import com.lifeos.core.domains.dto.response.SearchSuggestionResponse;
import com.lifeos.core.domains.record.PageResponse;
import com.lifeos.core.service.NoteSearchService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/notes/search")
@RequiredArgsConstructor
public class NoteSearchController {

  private final NoteSearchService noteSearchService;

  @GetMapping
  public ResponseEntity<ApiResponse<PageResponse<SearchResultResponse>>> search(
      Authentication authentication,
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(
        ApiResponse.success(
            PageResponse.from(noteSearchService.search(userId(authentication), q, page, size)),
            "Search results fetched successfully"));
  }

  @GetMapping("/suggestions")
  public ResponseEntity<ApiResponse<List<SearchSuggestionResponse>>> suggestions(
      Authentication authentication,
      @RequestParam(defaultValue = "") String q,
      @RequestParam(required = false) String type) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteSearchService.suggestions(userId(authentication), q, type), "Suggestions fetched successfully"));
  }

  @GetMapping("/recent")
  public ResponseEntity<ApiResponse<List<RecentSearchResponse>>> recent(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteSearchService.recentSearches(userId(authentication)), "Recent searches fetched successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
