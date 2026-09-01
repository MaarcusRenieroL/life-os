package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Notification;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    String type,
    String title,
    String body,
    String relatedEntityType,
    UUID relatedEntityId,
    boolean read,
    Instant createdAt) {

  public static NotificationResponse from(Notification notification) {
    return new NotificationResponse(
        notification.getId(),
        notification.getType(),
        notification.getTitle(),
        notification.getBody(),
        notification.getRelatedEntityType(),
        notification.getRelatedEntityId(),
        notification.isRead(),
        notification.getCreatedAt());
  }
}
