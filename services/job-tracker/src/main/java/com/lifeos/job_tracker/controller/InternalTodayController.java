package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.job_tracker.domains.dto.request.QuickCaptureJobRequest;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.service.JobListingService;
import com.lifeos.job_tracker.service.TodayService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Called by core's cross-module Today aggregation (and, on /quick-job, core's QuickCaptureService)
// via the internal API key, not by end users - see SecurityConfig's INTERNAL_SERVICE matcher for
// this prefix. No JWT auth context here, so userId arrives in the request instead of from
// Authentication (same pattern as the other internal-service-to-service calls in this codebase).
@RestController
@RequestMapping("/v1/jobs/internal")
@RequiredArgsConstructor
public class InternalTodayController {

  private final TodayService todayService;
  private final JobListingService jobListingService;

  @GetMapping("/today")
  public ResponseEntity<ApiResponse<List<TodayItemResponse>>> today(@RequestParam UUID userId) {
    return ResponseEntity.ok(ApiResponse.success(todayService.today(userId), "Today items fetched"));
  }

  @PostMapping("/quick-job")
  public ResponseEntity<ApiResponse<JobListing>> quickJob(@RequestBody QuickCaptureJobRequest request) {
    JobListing job =
        jobListingService.createFromQuickCapture(request.userId(), request.company(), request.title());
    return ResponseEntity.ok(ApiResponse.success(job, "Job listing created from quick capture"));
  }
}
