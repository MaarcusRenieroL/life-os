package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.request.SetAiFallbackApprovalRequest;
import com.lifeos.core.domains.dto.response.NotificationResponse;
import com.lifeos.core.domains.record.PageResponse;
import com.lifeos.core.service.NotificationService;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/core/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService notificationService;

  @GetMapping
  public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> list(
      Authentication authentication,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            notificationService.list(userId, PageRequest.of(page, size)),
            "Notifications fetched successfully"));
  }

  @GetMapping("/unread-count")
  public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            Map.of("count", notificationService.unreadCount(userId)),
            "Unread count fetched successfully"));
  }

  @PutMapping("/{id}/read")
  public ResponseEntity<ApiResponse<NotificationResponse>> markRead(
      Authentication authentication, @PathVariable UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            notificationService.markRead(userId, id), "Notification marked as read"));
  }

  @PutMapping("/read-all")
  public ResponseEntity<ApiResponse<Void>> markAllRead(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    notificationService.markAllRead(userId);

    return ResponseEntity.ok(ApiResponse.success(null, "All notifications marked as read"));
  }

  @PutMapping("/{id}/ai-fallback-approval")
  public ResponseEntity<ApiResponse<NotificationResponse>> setAiFallbackApproval(
      Authentication authentication,
      @PathVariable UUID id,
      @RequestBody SetAiFallbackApprovalRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            notificationService.setAiFallbackApproval(userId, id, request.isApproved()),
            "AI fallback approval recorded"));
  }
}
