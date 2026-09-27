package com.lifeos.common.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/** Publishes an {@link AuditEventRecord} to the shared `activity-events` Kafka topic, tagged with
 * this service's own name (from {@code spring.application.name}, already set per service) so
 * every service can share one implementation instead of a copy each differing only in that
 * literal. */
@Component
public class AuditEventPublisher {

  private final KafkaTemplate<String, AuditEventRecord> kafkaTemplate;
  private final String serviceName;

  public AuditEventPublisher(
      KafkaTemplate<String, AuditEventRecord> kafkaTemplate,
      @Value("${spring.application.name}") String serviceName) {
    this.kafkaTemplate = kafkaTemplate;
    this.serviceName = serviceName;
  }

  public void publish(
      UUID userId, AuditEventType eventType, String description, Map<String, String> metadata) {
    AuditEventRecord record =
        new AuditEventRecord(
            UUID.randomUUID(), serviceName, userId, eventType, description, metadata, Instant.now());

    kafkaTemplate.send("activity-events", userId.toString(), record);
  }
}
