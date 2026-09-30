package com.lifeos.common.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/** Publishes an {@link AutomationEventRecord} to the {@code automation-events} topic. Unlike the
 * notification publisher this is strictly fire-and-forget: automation is a convenience layered on
 * top of the real operation, so a broker hiccup must never fail (or slow down) creating a task or
 * completing a habit - every failure is swallowed with a warning.
 *
 * <p>Call it from the user-facing entry point (a controller), not from shared service code that
 * automation's own actions also go through - otherwise a rule that creates a task would trigger
 * every "task created" rule, including itself. */
@Component
public class AutomationEventPublisher {

  private static final Logger log = LoggerFactory.getLogger(AutomationEventPublisher.class);

  private final KafkaTemplate<String, AutomationEventRecord> kafkaTemplate;

  public AutomationEventPublisher(KafkaTemplate<String, AutomationEventRecord> automationEventKafkaTemplate) {
    this.kafkaTemplate = automationEventKafkaTemplate;
  }

  public void publish(
      UUID userId, String entityType, UUID entityId, AutomationEventRecord.Kind kind, String title, Map<String, String> attributes) {
    try {
      kafkaTemplate.send(
          "automation-events",
          userId.toString(),
          new AutomationEventRecord(UUID.randomUUID(), userId, entityType, entityId, kind, title, attributes == null ? Map.of() : attributes, Instant.now()));
    } catch (Exception exception) {
      log.warn("Could not publish automation event {} {} ({})", entityType, kind, exception.getMessage());
    }
  }
}
