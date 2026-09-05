package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.response.ResumeKeywordMatchResponse;
import com.lifeos.job_tracker.service.ResumeKeywordAnalysisService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/resumes/variants/{variantId}")
@RequiredArgsConstructor
public class ResumeKeywordController extends AuthenticatedController {

  private final ResumeKeywordAnalysisService keywordAnalysisService;

  @PostMapping("/analyze-keywords")
  public ResponseEntity<ApiResponse<ResumeKeywordMatchResponse>> analyze(
      Authentication authentication, @PathVariable UUID variantId, @RequestBody Map<String, UUID> body) {
    UUID jobListingId = body.get("jobListingId");
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                ResumeKeywordMatchResponse.from(
                    keywordAnalysisService.analyze(userId(authentication), variantId, jobListingId)),
                "Keyword analysis computed"));
  }

  @GetMapping("/keyword-matches")
  public ResponseEntity<ApiResponse<List<ResumeKeywordMatchResponse>>> matches(
      Authentication authentication, @PathVariable UUID variantId, @RequestParam(required = false) UUID jobListingId) {
    List<ResumeKeywordMatchResponse> body =
        keywordAnalysisService.history(userId(authentication), variantId, jobListingId).stream()
            .map(ResumeKeywordMatchResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Keyword match history fetched"));
  }
}
