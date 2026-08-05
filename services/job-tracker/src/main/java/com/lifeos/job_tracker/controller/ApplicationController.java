package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.CreateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.request.ScoreApplicationRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateApplicationRequest;
import com.lifeos.job_tracker.domains.dto.response.ApplicationResponse;
import com.lifeos.job_tracker.service.ApplicationService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/jobs/applications")
@RequiredArgsConstructor
public class ApplicationController {

  private final ApplicationService applicationService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ApplicationResponse>>> getApplications(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            applicationService.getAll(authentication), "Applications fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<ApplicationResponse>> getApplication(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            applicationService.get(authentication, id), "Application fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<ApplicationResponse>> createApplication(
      Authentication authentication, @Valid @RequestBody CreateApplicationRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            applicationService.save(authentication, request),
            "Application created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<ApplicationResponse>> updateApplication(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateApplicationRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            applicationService.update(authentication, id, request),
            "Application updated successfully"));
  }

  @PostMapping("/{id}/score")
  public ResponseEntity<ApiResponse<ApplicationResponse>> scoreApplication(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody ScoreApplicationRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            applicationService.score(authentication, id, request),
            "Application scored successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteApplication(
      Authentication authentication, @PathVariable UUID id) {
    applicationService.delete(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Application deleted successfully"));
  }
}
