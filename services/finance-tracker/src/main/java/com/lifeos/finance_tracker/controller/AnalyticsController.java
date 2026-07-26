package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.record.*;
import com.lifeos.finance_tracker.service.AnalyticsService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/finance/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

  private final AnalyticsService analyticsService;

  @GetMapping("/dashboard")
  public ResponseEntity<ApiResponse<DashboardSummary>> getDashboard(Authentication authentication) {
    DashboardSummary data = analyticsService.getDashboardSummary(authentication);
    return ResponseEntity.ok(ApiResponse.success(data, "Dashboard data retrieved successfully"));
  }

  @GetMapping("/category/{id}")
  public ResponseEntity<ApiResponse<CategoryComparison>> getCategoryAnalytics(
      Authentication authentication, @PathVariable("id") UUID categoryId) {
    CategoryComparison data = analyticsService.getCategoryAnalytics(authentication, categoryId);
    return ResponseEntity.ok(
        ApiResponse.success(data, "Category trend comparisons fetched successfully"));
  }

  @GetMapping("/trends")
  public ResponseEntity<ApiResponse<List<MonthlyTrend>>> getTrends(Authentication authentication) {
    List<MonthlyTrend> data = analyticsService.getMonthlyTrends(authentication);
    return ResponseEntity.ok(
        ApiResponse.success(data, "12-month historical trends fetched successfully"));
  }

  @GetMapping("/merchants")
  public ResponseEntity<ApiResponse<List<MerchantSpend>>> getTopMerchants(
      Authentication authentication, @RequestParam(defaultValue = "10") int limit) {
    List<MerchantSpend> data = analyticsService.getTopMerchants(authentication, limit);
    return ResponseEntity.ok(
        ApiResponse.success(data, "Top merchants spend distributions fetched successfully"));
  }
}
