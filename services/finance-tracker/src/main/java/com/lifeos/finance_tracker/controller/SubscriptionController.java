package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.LogSubscriptionUseRequest;
import com.lifeos.finance_tracker.domains.dto.request.SaveSubscriptionRequest;
import com.lifeos.finance_tracker.domains.dto.response.SubscriptionChargeResponse;
import com.lifeos.finance_tracker.domains.dto.response.SubscriptionResponse;
import com.lifeos.finance_tracker.domains.dto.response.SubscriptionSummaryResponse;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import com.lifeos.finance_tracker.service.SubscriptionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/finance/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

  private final SubscriptionService subscriptionService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<SubscriptionResponse>>> list(
      Authentication authentication, @RequestParam(required = false) SubscriptionStatus status) {
    return ok(subscriptionService.list(userId(authentication), status), "Subscriptions fetched successfully");
  }

  @GetMapping("/summary")
  public ResponseEntity<ApiResponse<SubscriptionSummaryResponse>> summary(Authentication authentication) {
    return ok(subscriptionService.summary(userId(authentication)), "Subscription summary fetched successfully");
  }

  @PostMapping
  public ResponseEntity<ApiResponse<SubscriptionResponse>> create(
      Authentication authentication, @Valid @RequestBody SaveSubscriptionRequest request) {
    return ok(subscriptionService.create(userId(authentication), request), "Subscription created successfully");
  }

  @PostMapping("/from-pattern/{patternId}")
  public ResponseEntity<ApiResponse<SubscriptionResponse>> fromPattern(Authentication authentication, @PathVariable UUID patternId) {
    return ok(subscriptionService.fromPattern(userId(authentication), patternId), "Subscription created successfully");
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<SubscriptionResponse>> get(Authentication authentication, @PathVariable UUID id) {
    return ok(subscriptionService.get(userId(authentication), id), "Subscription fetched successfully");
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<SubscriptionResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SaveSubscriptionRequest request) {
    return ok(subscriptionService.update(userId(authentication), id, request), "Subscription updated successfully");
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    subscriptionService.delete(userId(authentication), id);
    return ok(null, "Subscription deleted successfully");
  }

  @PostMapping("/{id}/pause")
  public ResponseEntity<ApiResponse<SubscriptionResponse>> pause(Authentication authentication, @PathVariable UUID id) {
    return ok(subscriptionService.pause(userId(authentication), id), "Subscription paused");
  }

  @PostMapping("/{id}/resume")
  public ResponseEntity<ApiResponse<SubscriptionResponse>> resume(Authentication authentication, @PathVariable UUID id) {
    return ok(subscriptionService.resume(userId(authentication), id), "Subscription resumed");
  }

  @PostMapping("/{id}/cancel")
  public ResponseEntity<ApiResponse<SubscriptionResponse>> cancel(Authentication authentication, @PathVariable UUID id) {
    return ok(subscriptionService.cancel(userId(authentication), id), "Subscription cancelled");
  }

  @PostMapping("/{id}/log-use")
  public ResponseEntity<ApiResponse<SubscriptionResponse>> logUse(
      Authentication authentication, @PathVariable UUID id, @RequestBody(required = false) LogSubscriptionUseRequest request) {
    return ok(subscriptionService.logUse(userId(authentication), id, request == null ? null : request.date()), "Usage logged");
  }

  @PostMapping("/{id}/charge")
  public ResponseEntity<ApiResponse<SubscriptionResponse>> chargeNow(Authentication authentication, @PathVariable UUID id) {
    return ok(subscriptionService.chargeNow(userId(authentication), id), "Charge recorded");
  }

  @GetMapping("/{id}/charges")
  public ResponseEntity<ApiResponse<List<SubscriptionChargeResponse>>> charges(Authentication authentication, @PathVariable UUID id) {
    return ok(subscriptionService.charges(userId(authentication), id), "Charges fetched successfully");
  }

  private static <T> ResponseEntity<ApiResponse<T>> ok(T data, String message) {
    return ResponseEntity.ok(ApiResponse.success(data, message));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
