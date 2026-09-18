package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.record.AiUsageSummaryResponse;
import com.lifeos.job_tracker.service.AiUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Not user-scoped - this is the whole app's own Claude spend (one household, one Anthropic
 * account), same reasoning as job-tracker/analytics being fine to read without extra filtering. */
@RestController
@RequestMapping("/v1/jobs/ai-usage")
@RequiredArgsConstructor
public class AiUsageController {

  private final AiUsageService aiUsageService;

  @GetMapping("/summary")
  public ResponseEntity<ApiResponse<AiUsageSummaryResponse>> summary() {
    return ResponseEntity.ok(ApiResponse.success(aiUsageService.summary(), "Usage summary computed"));
  }
}
