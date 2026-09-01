package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.Notification;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.repository.NotificationRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

  private final NotificationRepository notificationRepository;

  @Transactional
  public Notification push(
      UUID userId, String type, String title, String body, String entityType, UUID entityId) {
    return notificationRepository.save(
        Notification.builder()
            .userId(userId)
            .type(type)
            .title(title)
            .body(body)
            .relatedEntityType(entityType)
            .relatedEntityId(entityId)
            .build());
  }

  @Transactional(readOnly = true)
  public List<Notification> list(UUID userId) {
    return notificationRepository.findTop100ByUserIdOrderByCreatedAtDesc(userId);
  }

  @Transactional(readOnly = true)
  public long unreadCount(UUID userId) {
    return notificationRepository.countByUserIdAndReadIsFalse(userId);
  }

  @Transactional
  public void markRead(UUID userId, UUID notificationId) {
    Notification notification =
        notificationRepository
            .findByIdAndUserId(notificationId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Notification", notificationId));
    notification.setRead(true);
    notificationRepository.save(notification);
  }

  @Transactional
  public int markAllRead(UUID userId) {
    return notificationRepository.markAllRead(userId);
  }
}
