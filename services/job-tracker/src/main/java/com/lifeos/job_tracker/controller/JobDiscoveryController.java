package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.ScrapedJob;
import com.lifeos.job_tracker.domains.dto.request.UpsertJobSourceRequest;
import com.lifeos.job_tracker.domains.dto.response.JobSourceResponse;
import com.lifeos.job_tracker.service.JobIngestionService;
import com.lifeos.job_tracker.service.JobSourceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Job-source config + scrape/import triggers. Lives under /v1/jobs alongside the listing endpoints. */
@RestController
@RequestMapping("/v1/jobs")
@RequiredArgsConstructor
public class JobDiscoveryController extends AuthenticatedController {

  private final JobSourceService jobSourceService;
  private final JobIngestionService jobIngestionService;

  @GetMapping("/sources")
  public ResponseEntity<ApiResponse<List<JobSourceResponse>>> listSources(Authentication authentication) {
    List<JobSourceResponse> body =
        jobSourceService.list(userId(authentication)).stream().map(JobSourceResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Sources fetched"));
  }

  @PostMapping("/sources")
  public ResponseEntity<ApiResponse<JobSourceResponse>> createSource(
      Authentication authentication, @Valid @RequestBody UpsertJobSourceRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            ApiResponse.success(
                JobSourceResponse.from(jobSourceService.create(userId(authentication), request)),
                "Source created"));
  }

  @PatchMapping("/sources/{sourceId}")
  public ResponseEntity<ApiResponse<JobSourceResponse>> updateSource(
      Authentication authentication,
      @PathVariable UUID sourceId,
      @Valid @RequestBody UpsertJobSourceRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobSourceResponse.from(jobSourceService.update(userId(authentication), sourceId, request)),
            "Source updated"));
  }

  @DeleteMapping("/sources/{sourceId}")
  public ResponseEntity<ApiResponse<Void>> deleteSource(
      Authentication authentication, @PathVariable UUID sourceId) {
    jobSourceService.delete(userId(authentication), sourceId);
    return ResponseEntity.ok(ApiResponse.success(null, "Source deleted"));
  }

  @PostMapping("/scrape")
  public ResponseEntity<ApiResponse<Map<String, Object>>> scrape(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(jobSourceService.runScrape(userId(authentication)), "Scrape complete"));
  }

  @PostMapping("/import")
  public ResponseEntity<ApiResponse<Map<String, Object>>> importJobs(
      Authentication authentication, @RequestBody List<ScrapedJob> jobs) {
    return ResponseEntity.ok(
        ApiResponse.success(jobIngestionService.ingest(userId(authentication), jobs), "Import complete"));
  }
}
