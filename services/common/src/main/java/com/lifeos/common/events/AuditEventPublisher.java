package com.lifeos.common.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/** Publishes an {@link AuditEventRecord} to the shared `activity-events` Kafka topic, tagged with
 * the calling module's name (see {@link ModuleNames}). */
@Component
public class AuditEventPublisher {

  private final KafkaTemplate<String, AuditEventRecord> kafkaTemplate;

  public AuditEventPublisher(
      KafkaTemplate<String, AuditEventRecord> kafkaTemplate) {
    this.kafkaTemplate = kafkaTemplate;
  }

  public void publish(
      UUID userId, AuditEventType eventType, String description, Map<String, String> metadata) {
    AuditEventRecord record =
        new AuditEventRecord(
            UUID.randomUUID(), ModuleNames.caller(), userId, eventType, description, metadata, Instant.now());

    kafkaTemplate.send("activity-events", userId.toString(), record);
  }
}
