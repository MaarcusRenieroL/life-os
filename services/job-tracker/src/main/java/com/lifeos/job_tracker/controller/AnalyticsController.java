package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.service.AnalyticsService;
import com.lifeos.job_tracker.service.OfferService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController extends AuthenticatedController {

  private final AnalyticsService analyticsService;
  private final OfferService offerService;

  @GetMapping
  public ResponseEntity<ApiResponse<Map<String, Object>>> snapshot(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(analyticsService.snapshot(userId(authentication)), "Analytics computed"));
  }

  @GetMapping("/offer-comparison")
  public ResponseEntity<ApiResponse<List<Map<String, Object>>>> offerComparison(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(offerService.compare(userId(authentication)), "Offer comparison computed"));
  }
}
