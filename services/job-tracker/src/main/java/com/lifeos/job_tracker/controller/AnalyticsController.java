package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.record.JobAnalyticsResponse;
import com.lifeos.job_tracker.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/jobs/analytics")
@RequiredArgsConstructor
public class AnalyticsController extends AuthenticatedController {

  private final AnalyticsService analyticsService;

  @GetMapping
  public ResponseEntity<ApiResponse<JobAnalyticsResponse>> get(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(analyticsService.compute(userId(authentication)), "Analytics computed"));
  }
}
