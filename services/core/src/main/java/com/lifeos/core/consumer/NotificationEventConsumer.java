package com.lifeos.core.consumer;

import com.lifeos.common.events.NotificationEventRecord;
import com.lifeos.core.domains.entity.Notification;
import com.lifeos.core.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import com.lifeos.common.events.AfterCommit;
import com.lifeos.common.events.SerialEventQueue;
import org.springframework.stereotype.Component;

/** Consumes every module's published notifications into one table. Dedupes on the
 * publisher-assigned eventId (same pattern as batches' AuditEventConsumer), so a replayed
 * event never creates a duplicate notification. */
@Component
@RequiredArgsConstructor
public class NotificationEventConsumer {

  private final NotificationRepository notificationRepository;

  private final SerialEventQueue queue = new SerialEventQueue("notification");

  @AfterCommit
  public void listen(NotificationEventRecord event) {
    queue.submit(() -> save(event));
  }

  private void save(NotificationEventRecord event) {
    if (notificationRepository.existsById(event.eventId())) {
      return;
    }

    notificationRepository.save(
        Notification.builder()
            .id(event.eventId())
            .userId(event.userId())
            .module(event.module())
            .type(event.type().name())
            .title(event.title())
            .body(event.body())
            .metadata(event.metadata())
            .read(false)
            .requiresAiFallbackApproval(event.requiresAiFallbackApproval())
            .aiFallbackApproved(event.requiresAiFallbackApproval() ? false : null)
            .occurredAt(event.occurredAt())
            .build());
  }
}
