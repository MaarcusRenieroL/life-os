package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.CreateInterviewRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateInterviewRequest;
import com.lifeos.job_tracker.domains.dto.response.InterviewResponse;
import com.lifeos.job_tracker.service.InterviewService;
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
@RequestMapping("/v1/jobs/applications/{applicationId}/interviews")
@RequiredArgsConstructor
public class InterviewController {

  private final InterviewService interviewService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<InterviewResponse>>> getInterviews(
      Authentication authentication, @PathVariable UUID applicationId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            interviewService.getAll(authentication, applicationId),
            "Interviews fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<InterviewResponse>> createInterview(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @Valid @RequestBody CreateInterviewRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            interviewService.create(authentication, applicationId, request),
            "Interview created successfully"));
  }

  @PutMapping("/{interviewId}")
  public ResponseEntity<ApiResponse<InterviewResponse>> updateInterview(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @PathVariable UUID interviewId,
      @Valid @RequestBody UpdateInterviewRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            interviewService.update(authentication, applicationId, interviewId, request),
            "Interview updated successfully"));
  }

  @DeleteMapping("/{interviewId}")
  public ResponseEntity<ApiResponse<Void>> deleteInterview(
      Authentication authentication,
      @PathVariable UUID applicationId,
      @PathVariable UUID interviewId) {
    interviewService.delete(authentication, applicationId, interviewId);

    return ResponseEntity.ok(ApiResponse.success(null, "Interview deleted successfully"));
  }
}
