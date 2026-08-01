package com.lifeos.common.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AuditEventRecord(
    UUID eventId,
    String service,
    UUID userId,
    AuditEventType eventType,
    String description,
    Map<String, String> metadata,
    Instant occurredAt) {}
