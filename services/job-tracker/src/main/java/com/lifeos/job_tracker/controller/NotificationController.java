package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.response.NotificationResponse;
import com.lifeos.job_tracker.service.NotificationService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/notifications")
@RequiredArgsConstructor
public class NotificationController extends AuthenticatedController {

  private final NotificationService notificationService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<NotificationResponse>>> list(Authentication authentication) {
    List<NotificationResponse> body =
        notificationService.list(userId(authentication)).stream().map(NotificationResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Notifications fetched"));
  }

  @GetMapping("/unread-count")
  public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            Map.of("count", notificationService.unreadCount(userId(authentication))), "Unread count"));
  }

  @PostMapping("/{notificationId}/read")
  public ResponseEntity<ApiResponse<Void>> markRead(
      Authentication authentication, @PathVariable UUID notificationId) {
    notificationService.markRead(userId(authentication), notificationId);
    return ResponseEntity.ok(ApiResponse.success(null, "Marked read"));
  }

  @PostMapping("/read-all")
  public ResponseEntity<ApiResponse<Map<String, Integer>>> markAllRead(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            Map.of("updated", notificationService.markAllRead(userId(authentication))), "All marked read"));
  }
}
