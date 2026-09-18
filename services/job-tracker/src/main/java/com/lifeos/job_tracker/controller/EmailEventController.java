package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.ReviewEmailEventRequest;
import com.lifeos.job_tracker.domains.dto.response.EmailEventResponse;
import com.lifeos.job_tracker.domains.entity.EmailEvent;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.service.EmailEventService;
import com.lifeos.job_tracker.service.JobListingService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/jobs/email-events")
@RequiredArgsConstructor
public class EmailEventController extends AuthenticatedController {

  private final EmailEventService emailEventService;
  private final JobListingService jobListingService;

  @GetMapping("/needs-review")
  public ResponseEntity<ApiResponse<List<EmailEventResponse>>> needsReview(Authentication authentication) {
    UUID userId = userId(authentication);
    List<EmailEventResponse> body =
        emailEventService.needsReview(userId).stream().map(event -> toResponse(userId, event)).toList();

    return ResponseEntity.ok(ApiResponse.success(body, "Pending email events fetched"));
  }

  @PostMapping("/{eventId}/review")
  public ResponseEntity<ApiResponse<EmailEventResponse>> review(
      Authentication authentication, @PathVariable UUID eventId, @Valid @RequestBody ReviewEmailEventRequest request) {
    UUID userId = userId(authentication);
    EmailEvent event = emailEventService.review(userId, eventId, request);

    return ResponseEntity.ok(ApiResponse.success(toResponse(userId, event), "Email event reviewed"));
  }

  private EmailEventResponse toResponse(UUID userId, EmailEvent event) {
    if (event.getMatchedJobId() == null) {
      return EmailEventResponse.from(event, null, null);
    }
    JobListing job = jobListingService.get(userId, event.getMatchedJobId());
    return EmailEventResponse.from(event, job.getTitle(), job.getCompany());
  }
}
