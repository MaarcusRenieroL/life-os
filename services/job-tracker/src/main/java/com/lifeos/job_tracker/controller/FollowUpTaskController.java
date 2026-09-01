package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.CreateFollowUpTaskRequest;
import com.lifeos.job_tracker.domains.dto.response.FollowUpTaskResponse;
import com.lifeos.job_tracker.domains.enums.FollowUpTaskStatus;
import com.lifeos.job_tracker.service.FollowUpTaskService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/follow-ups")
@RequiredArgsConstructor
public class FollowUpTaskController extends AuthenticatedController {

  private final FollowUpTaskService followUpTaskService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<FollowUpTaskResponse>>> list(
      Authentication authentication, @RequestParam(required = false) FollowUpTaskStatus status) {
    List<FollowUpTaskResponse> body =
        followUpTaskService.list(userId(authentication), status).stream()
            .map(FollowUpTaskResponse::from)
            .toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Follow-up tasks fetched"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<FollowUpTaskResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateFollowUpTaskRequest request) {
    FollowUpTaskResponse body =
        FollowUpTaskResponse.from(followUpTaskService.create(userId(authentication), request));
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(body, "Task created"));
  }

  @PostMapping("/{taskId}/complete")
  public ResponseEntity<ApiResponse<FollowUpTaskResponse>> complete(
      Authentication authentication, @PathVariable UUID taskId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            FollowUpTaskResponse.from(
                followUpTaskService.setStatus(userId(authentication), taskId, FollowUpTaskStatus.DONE)),
            "Task completed"));
  }

  @PostMapping("/{taskId}/dismiss")
  public ResponseEntity<ApiResponse<FollowUpTaskResponse>> dismiss(
      Authentication authentication, @PathVariable UUID taskId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            FollowUpTaskResponse.from(
                followUpTaskService.setStatus(
                    userId(authentication), taskId, FollowUpTaskStatus.DISMISSED)),
            "Task dismissed"));
  }
}
