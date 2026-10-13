package com.lifeos.common.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/** Publishes an {@link AuditEventRecord} to the audit consumer in batches, tagged with
 * the calling module's name (see {@link ModuleNames}). */
@Component
public class AuditEventPublisher {

  private final ApplicationEventPublisher events;

  public AuditEventPublisher(
      ApplicationEventPublisher events) {
    this.events = events;
  }

  public void publish(
      UUID userId, AuditEventType eventType, String description, Map<String, String> metadata) {
    AuditEventRecord record =
        new AuditEventRecord(
            UUID.randomUUID(), ModuleNames.caller(), userId, eventType, description, metadata, Instant.now());

    events.publishEvent(record);
  }
}
