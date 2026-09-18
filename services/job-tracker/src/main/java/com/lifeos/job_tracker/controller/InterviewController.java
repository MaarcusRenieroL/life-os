package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.UpsertInterviewRequest;
import com.lifeos.job_tracker.domains.dto.response.InterviewResponse;
import com.lifeos.job_tracker.service.InterviewService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/v1/jobs/{jobId}/interviews")
@RequiredArgsConstructor
public class InterviewController extends AuthenticatedController {

  private final InterviewService interviewService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<InterviewResponse>>> list(
      Authentication authentication, @PathVariable UUID jobId) {
    List<InterviewResponse> body =
        interviewService.list(userId(authentication), jobId).stream().map(InterviewResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Interviews fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<InterviewResponse>> create(
      Authentication authentication, @PathVariable UUID jobId, @RequestBody UpsertInterviewRequest request) {
    InterviewResponse body =
        InterviewResponse.from(interviewService.create(userId(authentication), jobId, request));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Interview added"));
  }

  @PutMapping("/{interviewId}")
  public ResponseEntity<ApiResponse<InterviewResponse>> update(
      Authentication authentication,
      @PathVariable UUID jobId,
      @PathVariable UUID interviewId,
      @RequestBody UpsertInterviewRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            InterviewResponse.from(interviewService.update(userId(authentication), interviewId, request)),
            "Interview updated"));
  }

  @PostMapping("/{interviewId}/prep-topics")
  public ResponseEntity<ApiResponse<InterviewResponse>> generatePrepTopics(
      Authentication authentication, @PathVariable UUID jobId, @PathVariable UUID interviewId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            InterviewResponse.from(interviewService.generatePrepTopics(userId(authentication), interviewId)),
            "Prep topics generated"));
  }

  @DeleteMapping("/{interviewId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID jobId, @PathVariable UUID interviewId) {
    interviewService.delete(userId(authentication), interviewId);
    return ResponseEntity.ok(ApiResponse.success(null, "Interview deleted"));
  }
}
