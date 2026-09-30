package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.SaveSubscriptionRequest;
import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import com.lifeos.finance_tracker.exception.InvalidRequestException;
import com.lifeos.finance_tracker.repository.SubscriptionRepository;
import com.lifeos.finance_tracker.service.SubscriptionBillingService;
import com.lifeos.finance_tracker.service.SubscriptionService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Called by core's email hub when a receipt or renewal notice names a subscription. Internal API
// key only, userId as a request param since internal calls carry no JWT.
@RestController
@RequestMapping("/v1/finance/internal")
@RequiredArgsConstructor
public class InternalSubscriptionController {

  private final SubscriptionService subscriptionService;
  private final SubscriptionRepository subscriptionRepository;

  public record EmailSubscriptionRequest(
      String name, BigDecimal amount, BillingCycle billingCycle, LocalDate nextBillingDate, String notes) {}

  public record EmailSubscriptionResult(UUID id, boolean created) {}

  /**
   * Tracks a subscription found in an email, unless one with the same name is already tracked - an
   * email must never change a subscription the candidate set up by hand, so an existing one is
   * left exactly as it is. A billing date already in the past (a receipt for the charge that just
   * happened) is rolled forward to the next one.
   */
  @PostMapping("/subscriptions")
  public ResponseEntity<ApiResponse<EmailSubscriptionResult>> create(
      @RequestParam UUID userId, @RequestBody EmailSubscriptionRequest request) {
    if (request.name() == null || request.name().isBlank()) {
      throw new InvalidRequestException("name is required");
    }
    if (request.amount() == null || request.amount().signum() <= 0) {
      throw new InvalidRequestException("amount must be positive");
    }
    if (request.billingCycle() == null || request.nextBillingDate() == null) {
      throw new InvalidRequestException("billingCycle and nextBillingDate are required");
    }

    var existing = subscriptionRepository.findFirstByUserIdAndNameIgnoreCase(userId, request.name().trim());
    if (existing.isPresent()) {
      return ResponseEntity.ok(ApiResponse.success(new EmailSubscriptionResult(existing.get().getId(), false), "Already tracked"));
    }

    LocalDate today = SubscriptionBillingService.today();
    LocalDate next = request.nextBillingDate();
    int anchorDay = next.getDayOfMonth();
    // Bounded: a date years in the past would otherwise loop for a long time on a weekly cycle.
    for (int guard = 0; next.isBefore(today) && guard < 600; guard++) {
      next = request.billingCycle().next(next, anchorDay);
    }

    var saved =
        subscriptionService.create(
            userId,
            new SaveSubscriptionRequest(
                request.name().trim(), request.amount(), request.billingCycle(), next, null, null, null, null, null, null,
                request.notes() == null || request.notes().isBlank() ? "Found in your email" : request.notes()));
    return ResponseEntity.ok(ApiResponse.success(new EmailSubscriptionResult(saved.id(), true), "Subscription tracked"));
  }

  @DeleteMapping("/subscriptions/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(@RequestParam UUID userId, @PathVariable UUID id) {
    subscriptionService.delete(userId, id);
    return ResponseEntity.ok(ApiResponse.success(null, "Subscription removed"));
  }
}
