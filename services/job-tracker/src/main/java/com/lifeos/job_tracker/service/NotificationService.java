package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpdateNotificationSettingsRequest;
import com.lifeos.job_tracker.domains.dto.response.NotificationResponse;
import com.lifeos.job_tracker.domains.dto.response.NotificationSettingsResponse;
import com.lifeos.job_tracker.domains.entity.Notification;
import com.lifeos.job_tracker.domains.entity.NotificationSettings;
import com.lifeos.job_tracker.exception.NotificationNotFoundException;
import com.lifeos.job_tracker.repository.NotificationRepository;
import com.lifeos.job_tracker.repository.NotificationSettingsRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

  private final NotificationRepository notificationRepository;
  private final NotificationSettingsRepository notificationSettingsRepository;

  public List<NotificationResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  public NotificationResponse markAsRead(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    Notification notification =
        notificationRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotificationNotFoundException(id));

    notification.setIsRead(true);

    return toResponse(notificationRepository.saveAndFlush(notification));
  }

  public NotificationSettingsResponse getSettings(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toSettingsResponse(getOrCreateSettings(userId));
  }

  public NotificationSettingsResponse updateSettings(
      Authentication authentication, UpdateNotificationSettingsRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    NotificationSettings settings = getOrCreateSettings(userId);

    if (request.getEmailOnStageChange() != null) {
      settings.setEmailOnStageChange(request.getEmailOnStageChange());
    }

    if (request.getEmailOnInterviewScheduled() != null) {
      settings.setEmailOnInterviewScheduled(request.getEmailOnInterviewScheduled());
    }

    if (request.getEmailOnOfferReceived() != null) {
      settings.setEmailOnOfferReceived(request.getEmailOnOfferReceived());
    }

    if (request.getEmailOnFollowUpDue() != null) {
      settings.setEmailOnFollowUpDue(request.getEmailOnFollowUpDue());
    }

    return toSettingsResponse(notificationSettingsRepository.saveAndFlush(settings));
  }

  private NotificationSettings getOrCreateSettings(UUID userId) {
    return notificationSettingsRepository
        .findByUserId(userId)
        .orElseGet(
            () ->
                notificationSettingsRepository.saveAndFlush(
                    NotificationSettings.builder()
                        .userId(userId)
                        .emailOnStageChange(true)
                        .emailOnInterviewScheduled(true)
                        .emailOnOfferReceived(true)
                        .emailOnFollowUpDue(true)
                        .build()));
  }

  private NotificationResponse toResponse(Notification notification) {
    return NotificationResponse.builder()
        .id(notification.getId())
        .referenceType(notification.getReferenceType())
        .referenceId(notification.getReferenceId())
        .message(notification.getMessage())
        .isRead(notification.getIsRead() != null && notification.getIsRead())
        .createdAt(notification.getCreatedAt())
        .build();
  }

  private NotificationSettingsResponse toSettingsResponse(NotificationSettings settings) {
    return NotificationSettingsResponse.builder()
        .id(settings.getId())
        .emailOnStageChange(
            settings.getEmailOnStageChange() != null && settings.getEmailOnStageChange())
        .emailOnInterviewScheduled(
            settings.getEmailOnInterviewScheduled() != null
                && settings.getEmailOnInterviewScheduled())
        .emailOnOfferReceived(
            settings.getEmailOnOfferReceived() != null && settings.getEmailOnOfferReceived())
        .emailOnFollowUpDue(
            settings.getEmailOnFollowUpDue() != null && settings.getEmailOnFollowUpDue())
        .updatedAt(settings.getUpdatedAt())
        .build();
  }
}
