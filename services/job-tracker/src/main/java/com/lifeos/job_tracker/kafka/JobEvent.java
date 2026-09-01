package com.lifeos.job_tracker.kafka;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Envelope for every job-tracker domain event. {@code payload} keys are documented per topic. */
public record JobEvent(
    UUID eventId, UUID userId, Instant timestamp, String eventType, Map<String, Object> payload) {

  public static JobEvent of(UUID userId, String eventType, Map<String, Object> payload) {
    return new JobEvent(UUID.randomUUID(), userId, Instant.now(), eventType, payload);
  }
}
