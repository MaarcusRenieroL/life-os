package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.analytics.AnalyticsModels;
import com.lifeos.core.analytics.AnalyticsService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/core/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

  private final AnalyticsService analyticsService;

  @GetMapping("/dashboard")
  public ResponseEntity<ApiResponse<AnalyticsModels.Dashboard>> dashboard(Authentication authentication) {
    return ok(analyticsService.dashboard(userId(authentication)), "Analytics dashboard fetched");
  }

  @GetMapping("/daily")
  public ResponseEntity<ApiResponse<AnalyticsModels.DailySnapshot>> daily(
      Authentication authentication, @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
    return ok(analyticsService.daily(userId(authentication), date), "Daily analytics fetched");
  }

  /** period is WEEK (default) or MONTH; asOf picks which one (any date inside it). */
  @GetMapping("/summary")
  public ResponseEntity<ApiResponse<AnalyticsModels.PeriodSummary>> summary(
      Authentication authentication,
      @RequestParam(defaultValue = "WEEK") String period,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
    return ok(analyticsService.summary(userId(authentication), period, asOf), "Analytics summary fetched");
  }

  @GetMapping("/trends")
  public ResponseEntity<ApiResponse<List<AnalyticsModels.TrendPoint>>> trends(
      Authentication authentication, @RequestParam(defaultValue = "30") int days, @RequestParam(defaultValue = "DAY") String bucket) {
    return ok(analyticsService.trends(userId(authentication), days, "WEEK".equalsIgnoreCase(bucket)), "Trends fetched");
  }

  @GetMapping("/anomalies")
  public ResponseEntity<ApiResponse<List<AnalyticsModels.Anomaly>>> anomalies(Authentication authentication) {
    return ok(analyticsService.anomalies(userId(authentication)), "Anomalies fetched");
  }

  @GetMapping("/insights")
  public ResponseEntity<ApiResponse<List<AnalyticsModels.Insight>>> insights(
      Authentication authentication, @RequestParam(defaultValue = "60") int days) {
    return ok(analyticsService.insights(userId(authentication), days), "Insights fetched");
  }

  private static <T> ResponseEntity<ApiResponse<T>> ok(T data, String message) {
    return ResponseEntity.ok(ApiResponse.success(data, message));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
