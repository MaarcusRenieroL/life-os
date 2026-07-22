package com.lifeos.batches.domains.dto.responses;

import com.lifeos.common.events.AuditEventType;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
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
