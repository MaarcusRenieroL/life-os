package com.lifeos.batches.consumer;

import com.lifeos.batches.domains.entity.AuditEvent;
import com.lifeos.batches.repository.AuditEventRepository;
import com.lifeos.common.events.AuditEventRecord;
import lombok.RequiredArgsConstructor;
import com.lifeos.common.events.AfterCommit;
import com.lifeos.common.events.SerialEventQueue;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuditEventConsumer {

  private final AuditEventRepository auditEventRepository;

  private final SerialEventQueue queue = new SerialEventQueue("audit");

  @AfterCommit
  public void listener(AuditEventRecord event) {
    queue.submit(() -> save(event));
  }

  private void save(AuditEventRecord event) {
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
