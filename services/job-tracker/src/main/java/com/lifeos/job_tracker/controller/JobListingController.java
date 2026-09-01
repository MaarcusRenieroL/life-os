package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.CreateJobListingRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateJobListingRequest;
import com.lifeos.job_tracker.domains.dto.response.JobListingResponse;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.domains.record.PageResponse;
import com.lifeos.job_tracker.service.JobListingService;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/jobs")
@RequiredArgsConstructor
public class JobListingController extends AuthenticatedController {

  private final JobListingService jobListingService;

  @GetMapping
  public ResponseEntity<ApiResponse<PageResponse<JobListingResponse>>> search(
      Authentication authentication,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String location,
      @RequestParam(name = "salary_min", required = false) BigDecimal salaryMin,
      @RequestParam(required = false) WorkModel workModel,
      @RequestParam(required = false) SeniorityLevel seniority,
      @RequestParam(required = false) String source,
      @RequestParam(name = "min_score", required = false) Integer minScore,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    PageResponse<JobListingResponse> body =
        PageResponse.from(
            jobListingService
                .search(userId(authentication), q, location, salaryMin, workModel, seniority, source, minScore, page, size)
                .map(JobListingResponse::from));
    return ResponseEntity.ok(ApiResponse.success(body, "Jobs fetched"));
  }

  @GetMapping("/curated")
  public ResponseEntity<ApiResponse<PageResponse<JobListingResponse>>> curated(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate since,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    PageResponse<JobListingResponse> body =
        PageResponse.from(
            jobListingService.curated(userId(authentication), since, page, size).map(JobListingResponse::from));
    return ResponseEntity.ok(ApiResponse.success(body, "Curated jobs fetched"));
  }

  @GetMapping("/saved")
  public ResponseEntity<ApiResponse<List<JobListingResponse>>> saved(Authentication authentication) {
    List<JobListingResponse> body =
        jobListingService.saved(userId(authentication)).stream().map(JobListingResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Saved jobs fetched"));
  }

  @GetMapping("/{jobId}")
  public ResponseEntity<ApiResponse<JobListingResponse>> get(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(jobListingService.get(userId(authentication), jobId)), "Job fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<JobListingResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateJobListingRequest request) {
    JobListingResponse body =
        JobListingResponse.from(jobListingService.create(userId(authentication), request));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Job created"));
  }

  @PatchMapping("/{jobId}")
  public ResponseEntity<ApiResponse<JobListingResponse>> update(
      Authentication authentication,
      @PathVariable UUID jobId,
      @RequestBody UpdateJobListingRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            JobListingResponse.from(jobListingService.update(userId(authentication), jobId, request)),
            "Job updated"));
  }

  @GetMapping("/{jobId}/fit-score")
  public ResponseEntity<ApiResponse<JobFitResult>> fitScore(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            jobListingService.scoreAndPersist(userId(authentication), jobId), "Fit score computed"));
  }

  @PostMapping("/{jobId}/rescore")
  public ResponseEntity<ApiResponse<JobFitResult>> rescore(
      Authentication authentication, @PathVariable UUID jobId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            jobListingService.scoreAndPersist(userId(authentication), jobId), "Fit score recomputed"));
  }
}
