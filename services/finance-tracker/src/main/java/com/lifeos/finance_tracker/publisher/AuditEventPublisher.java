package com.lifeos.finance_tracker.publisher;

import com.lifeos.common.events.AuditEventRecord;
import com.lifeos.common.events.AuditEventType;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuditEventPublisher {

  private final KafkaTemplate<String, AuditEventRecord> kafkaTemplate;

  public void publish(
      UUID userId, AuditEventType eventType, String description, Map<String, String> metadata) {
    AuditEventRecord record =
        new AuditEventRecord(
            UUID.randomUUID(),
            "finance_tracker",
            userId,
            eventType,
            description,
            metadata,
            Instant.now());

    kafkaTemplate.send("activity-events", userId.toString(), record);
  }
}
