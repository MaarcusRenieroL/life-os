package com.lifeos.batches.controller;

import com.lifeos.batches.domains.dto.responses.AuditEventResponse;
import com.lifeos.batches.domains.entity.AuditEvent;
import com.lifeos.batches.repository.AuditEventRepository;
import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.domains.dto.response.PageResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/batches/audit-events")
@RequiredArgsConstructor
public class AuditEventController {

  private final AuditEventRepository auditEventRepository;

  @GetMapping
  public ResponseEntity<ApiResponse<PageResponse<AuditEventResponse>>> getEvents(
      Authentication authentication,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    UUID userId = (UUID) authentication.getPrincipal();

    PageResponse<AuditEventResponse> events =
        PageResponse.from(
            auditEventRepository
                .findAllByUserIdOrderByOccurredAtDesc(userId, PageRequest.of(page, size))
                .map(this::toResponse));

    return ResponseEntity.ok(ApiResponse.success(events, "Audit events retrieved successfully"));
  }

  private AuditEventResponse toResponse(AuditEvent event) {
    return AuditEventResponse.builder()
        .eventId(event.getEventId())
        .metadata(event.getMetadata())
        .description(event.getDescription())
        .eventType(event.getEventType())
        .service(event.getService())
        .occurredAt(event.getOccurredAt())
        .build();
  }
}
