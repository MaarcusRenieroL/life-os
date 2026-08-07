package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.request.UpdateNotificationSettingsRequest;
import com.lifeos.job_tracker.domains.dto.response.NotificationResponse;
import com.lifeos.job_tracker.domains.dto.response.NotificationSettingsResponse;
import com.lifeos.job_tracker.service.NotificationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/jobs/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService notificationService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            notificationService.getAll(authentication), "Notifications fetched successfully"));
  }

  @PostMapping("/{id}/read")
  public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            notificationService.markAsRead(authentication, id),
            "Notification marked as read"));
  }

  @GetMapping("/settings")
  public ResponseEntity<ApiResponse<NotificationSettingsResponse>> getSettings(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            notificationService.getSettings(authentication),
            "Notification settings fetched successfully"));
  }

  @PutMapping("/settings")
  public ResponseEntity<ApiResponse<NotificationSettingsResponse>> updateSettings(
      Authentication authentication, @Valid @RequestBody UpdateNotificationSettingsRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            notificationService.updateSettings(authentication, request),
            "Notification settings updated successfully"));
  }
}
