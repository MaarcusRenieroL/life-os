package com.lifeos.batches.consumer;

import com.lifeos.batches.domains.entity.AuditEvent;
import com.lifeos.batches.repository.AuditEventRepository;
import com.lifeos.common.events.AuditEventRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuditEventConsumer {

  private final AuditEventRepository auditEventRepository;

  @KafkaListener(topics = "activity-events", groupId = "batches-service")
  public void listener(AuditEventRecord event) {

    if (auditEventRepository.existsById(event.eventId())) {
      return;
    }

    auditEventRepository.save(
        AuditEvent.builder()
            .eventId(event.eventId())
            .service(event.service())
            .userId(event.userId())
            .eventType(event.eventType())
            .description(event.description())
            .metadata(event.metadata())
            .occurredAt(event.occurredAt())
            .build());
  }
}
