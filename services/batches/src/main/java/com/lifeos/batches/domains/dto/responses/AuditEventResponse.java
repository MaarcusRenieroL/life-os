package com.lifeos.batches.domains.dto.responses;

import com.lifeos.common.events.AuditEventType;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.experimental.FieldDefaults;

@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuditEventResponse {

  UUID eventId;

  String service;

  AuditEventType eventType;

  String description;

  Map<String, String> metadata;

  Instant occurredAt;
}
