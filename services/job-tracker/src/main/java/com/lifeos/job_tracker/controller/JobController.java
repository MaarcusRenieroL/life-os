package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.client.JobScraperClient;
import com.lifeos.job_tracker.domains.dto.response.JobResponse;
import com.lifeos.job_tracker.service.JobService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/jobs")
@RequiredArgsConstructor
public class JobController {

  private final JobService jobService;
  private final JobScraperClient jobScraperClient;

  @GetMapping
  public ResponseEntity<ApiResponse<List<JobResponse>>> getJobs(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(jobService.getAll(authentication), "Jobs fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<JobResponse>> getJob(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(jobService.get(authentication, id), "Job fetched successfully"));
  }

  @PostMapping("/scrape/linkedin")
  public ResponseEntity<ApiResponse<Void>> scrapeLinkedIn() {
    jobScraperClient.triggerLinkedInScrape();

    return ResponseEntity.accepted().body(ApiResponse.success(null, "LinkedIn scrape triggered"));
  }

  @PostMapping("/scrape/naukri")
  public ResponseEntity<ApiResponse<Void>> scrapeNaukri() {
    jobScraperClient.triggerNaukriScrape();

    return ResponseEntity.accepted().body(ApiResponse.success(null, "Naukri scrape triggered"));
  }
}
