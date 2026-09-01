package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.IngestEmailRequest;
import com.lifeos.job_tracker.service.EmailIngestionService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal endpoint for the Gmail connector / MCP bridge. Guarded by {@code X-Internal-Api-Key} via
 * {@code SecurityConfig} ("/v1/jobs/internal/**" requires INTERNAL_SERVICE).
 */
@RestController
@RequestMapping("/v1/jobs/internal/emails")
@RequiredArgsConstructor
public class EmailIngestionController {

  private final EmailIngestionService emailIngestionService;

  @PostMapping("/ingest")
  public ResponseEntity<ApiResponse<Map<String, Object>>> ingest(
      @Valid @RequestBody IngestEmailRequest request) {
    var message = emailIngestionService.ingest(request);
    return ResponseEntity.ok(
        ApiResponse.success(
            Map.of(
                "emailMessageId", message.getId(),
                "category", message.getCategory().name(),
                "applicationId", String.valueOf(message.getApplicationId())),
            "Email ingested"));
  }
}
