package com.lifeos.core.service;

import com.lifeos.core.domains.entity.Notification;
import com.lifeos.core.domains.record.PageResponse;
import com.lifeos.core.domains.dto.response.NotificationResponse;
import com.lifeos.core.exception.ResourceNotFoundException;
import com.lifeos.core.repository.NotificationRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

  private final NotificationRepository notificationRepository;

  @Transactional(readOnly = true)
  public PageResponse<NotificationResponse> list(UUID userId, Pageable pageable) {
    return PageResponse.from(
        notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable).map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public long unreadCount(UUID userId) {
    return notificationRepository.countByUserIdAndReadFalse(userId);
  }

  @Transactional
  public NotificationResponse markRead(UUID userId, UUID id) {
    Notification notification =
        notificationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Notification", id));

    notification.setRead(true);

    return toResponse(notificationRepository.save(notification));
  }

  @Transactional
  public void markAllRead(UUID userId) {
    notificationRepository.markAllReadForUser(userId);
  }

  /** Records the user's yes/no on an AI-fallback-approval notification. Marking the
   * notification is all this does today - actually retrying the original operation with Claude
   * is each feature's own responsibility to wire up (it consumes the approval the same way it
   * would consume any other event), since only that feature knows how to resume what it was
   * doing. */
  @Transactional
  public NotificationResponse setAiFallbackApproval(UUID userId, UUID id, boolean approved) {
    Notification notification =
        notificationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Notification", id));

    if (!notification.isRequiresAiFallbackApproval()) {
      throw new IllegalStateException("This notification does not require AI fallback approval");
    }

    notification.setAiFallbackApproved(approved);
    notification.setRead(true);

    return toResponse(notificationRepository.save(notification));
  }

  private NotificationResponse toResponse(Notification notification) {
    return NotificationResponse.builder()
        .id(notification.getId())
        .module(notification.getModule())
        .type(notification.getType())
        .title(notification.getTitle())
        .body(notification.getBody())
        .metadata(notification.getMetadata())
        .read(notification.isRead())
        .requiresAiFallbackApproval(notification.isRequiresAiFallbackApproval())
        .aiFallbackApproved(notification.getAiFallbackApproved())
        .occurredAt(notification.getOccurredAt())
        .build();
  }
}
