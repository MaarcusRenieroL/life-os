package com.lifeos.common.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Something that happened to a user's item in one module (a task was created, an application's
 * status changed...), published for core's automation engine to match against the user's rules.
 * attributes carry the fields a rule condition can test (status, priority...) as strings. */
public record AutomationEventRecord(
    UUID eventId,
    UUID userId,
    String entityType,
    UUID entityId,
    Kind event,
    String title,
    Map<String, String> attributes,
    Instant occurredAt) {

  public enum Kind {
    CREATED,
    COMPLETED,
    UPDATED
  }
}
