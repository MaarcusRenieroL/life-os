package com.lifeos.core.controller;

import com.lifeos.common.web.Bounds;
import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.entity.EmailHubItem;
import com.lifeos.core.domains.enums.EmailHubStatus;
import com.lifeos.core.domains.dto.response.EmailHubItemResponse;
import com.lifeos.core.service.EmailHubService;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/core/email-hub")
@RequiredArgsConstructor
public class EmailHubController {

  private final EmailHubService emailHubService;

  /** @param status optional, repeatable; defaults to everything the hub acted on or is waiting on */
  @GetMapping("/items")
  public ResponseEntity<ApiResponse<List<EmailHubItemResponse>>> items(
      Authentication authentication,
      @RequestParam(required = false) List<EmailHubStatus> status,
      @RequestParam(defaultValue = "100") int limit) {
    Set<EmailHubStatus> statuses = status == null || status.isEmpty() ? EnumSet.noneOf(EmailHubStatus.class) : EnumSet.copyOf(status);
    List<EmailHubItemResponse> body =
        emailHubService.list(userId(authentication), statuses, Bounds.clamp(limit, 1, 500)).stream().map(EmailHubItemResponse::from).toList();
    return ResponseEntity.ok(ApiResponse.success(body, "Email items fetched"));
  }

  @GetMapping("/pending-count")
  public ResponseEntity<ApiResponse<Map<String, Long>>> pendingCount(Authentication authentication) {
    return ResponseEntity.ok(ApiResponse.success(Map.of("count", emailHubService.pendingCount(userId(authentication))), "Count fetched"));
  }

  @PostMapping("/items/{id}/approve")
  public ResponseEntity<ApiResponse<EmailHubItemResponse>> approve(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(respond(emailHubService.approve(userId(authentication), id)), "Approved"));
  }

  @PostMapping("/items/{id}/dismiss")
  public ResponseEntity<ApiResponse<EmailHubItemResponse>> dismiss(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(respond(emailHubService.dismiss(userId(authentication), id)), "Dismissed"));
  }

  @PostMapping("/items/{id}/undo")
  public ResponseEntity<ApiResponse<EmailHubItemResponse>> undo(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(respond(emailHubService.undo(userId(authentication), id)), "Undone"));
  }

  private static EmailHubItemResponse respond(EmailHubItem item) {
    return EmailHubItemResponse.from(item);
  }

  private static UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
