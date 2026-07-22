package com.lifeos.batches.controller;

import com.lifeos.batches.domains.dto.responses.AuditEventResponse;
import com.lifeos.batches.domains.entity.AuditEvent;
import com.lifeos.batches.repository.AuditEventRepository;
import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-events")
@RequiredArgsConstructor
public class AuditEventController {

  private final AuditEventRepository auditEventRepository;

  @GetMapping
  public ResponseEntity<ApiResponse<List<AuditEventResponse>>> getEvents(
      Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    List<AuditEventResponse> events =
        auditEventRepository.findAllByUserIdOrderByOccurredAtDesc(userId).stream()
            .map(event -> toResponse(event))
            .toList();

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
