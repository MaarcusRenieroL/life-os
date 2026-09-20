package com.lifeos.common.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/** Publishes a {@link NotificationEventRecord} to the shared {@code notification-events} Kafka
 * topic. Every service gets this for free via {@code com.lifeos.common} component scan, same as
 * {@link AuditEventPublisher} - call it from any module the moment something happens that the
 * user should be told about (a budget exceeded, an interview approaching, a streak at risk). */
@Component
public class NotificationEventPublisher {

  private final KafkaTemplate<String, NotificationEventRecord> kafkaTemplate;
  private final String serviceName;

  public NotificationEventPublisher(
      KafkaTemplate<String, NotificationEventRecord> notificationEventKafkaTemplate,
      @Value("${spring.application.name}") String serviceName) {
    this.kafkaTemplate = notificationEventKafkaTemplate;
    this.serviceName = serviceName;
  }

  public void publish(UUID userId, NotificationEventType type, String title, String body) {
    publish(userId, type, title, body, null, false);
  }

  public void publish(
      UUID userId,
      NotificationEventType type,
      String title,
      String body,
      Map<String, String> metadata) {
    publish(userId, type, title, body, metadata, false);
  }

  public void publish(
      UUID userId,
      NotificationEventType type,
      String title,
      String body,
      Map<String, String> metadata,
      boolean requiresAiFallbackApproval) {
    NotificationEventRecord record =
        new NotificationEventRecord(
            UUID.randomUUID(),
            userId,
            serviceName,
            type,
            title,
            body,
            metadata,
            requiresAiFallbackApproval,
            Instant.now());

    kafkaTemplate.send("notification-events", userId.toString(), record);
  }
}
