package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.IngestJobsRequest;
import com.lifeos.job_tracker.service.JobIngestionService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Internal endpoint the job-scraper microservice posts normalised jobs to. */
@RestController
@RequestMapping("/v1/jobs/internal/jobs")
@RequiredArgsConstructor
public class JobIngestionController {

  private final JobIngestionService jobIngestionService;

  @PostMapping("/ingest")
  public ResponseEntity<ApiResponse<Map<String, Object>>> ingest(
      @Valid @RequestBody IngestJobsRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            jobIngestionService.ingest(request.userId(), request.jobs()), "Jobs ingested"));
  }
}
