package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.CreateEmailEventRequest;
import com.lifeos.job_tracker.service.EmailEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Called by batches' scheduled Gmail poller via the internal API key, not by end users - see
// SecurityConfig's INTERNAL_SERVICE matcher for this prefix.
@RestController
@RequestMapping("/v1/jobs/internal")
@RequiredArgsConstructor
public class InternalEmailEventController {

  private final EmailEventService emailEventService;

  @PostMapping("/email-events")
  public ResponseEntity<ApiResponse<Void>> createEmailEvent(@Valid @RequestBody CreateEmailEventRequest request) {
    emailEventService.ingest(
        request.userId(), request.gmailMessageId(), request.fromAddress(), request.subject(), request.body());

    return ResponseEntity.ok(ApiResponse.success(null, "Email event processed"));
  }
}
