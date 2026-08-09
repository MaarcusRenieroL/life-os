package com.lifeos.job_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.dto.response.AnalyticsDashboardResponse;
import com.lifeos.job_tracker.domains.enums.ApplicationStage;
import com.lifeos.job_tracker.domains.enums.JobSource;
import com.lifeos.job_tracker.domains.record.ConversionFunnelResponse;
import com.lifeos.job_tracker.domains.record.RateResponse;
import com.lifeos.job_tracker.domains.record.ReferralEffectivenessResponse;
import com.lifeos.job_tracker.domains.record.SkillCount;
import com.lifeos.job_tracker.domains.record.TimeToOfferResponse;
import com.lifeos.job_tracker.service.AnalyticsService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/jobs/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

  private final AnalyticsService analyticsService;

  @GetMapping("/dashboard")
  public ResponseEntity<ApiResponse<AnalyticsDashboardResponse>> getDashboard(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            analyticsService.getDashboard(authentication), "Dashboard fetched successfully"));
  }

  @GetMapping("/pipeline")
  public ResponseEntity<ApiResponse<Map<ApplicationStage, Long>>> getPipeline(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            analyticsService.getPipeline(authentication), "Pipeline fetched successfully"));
  }

  @GetMapping("/response-rate")
  public ResponseEntity<ApiResponse<RateResponse>> getResponseRate(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            analyticsService.getResponseRate(authentication), "Response rate fetched successfully"));
  }

  @GetMapping("/offer-rate")
  public ResponseEntity<ApiResponse<RateResponse>> getOfferRate(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            analyticsService.getOfferRate(authentication), "Offer rate fetched successfully"));
  }

  @GetMapping("/source-performance")
  public ResponseEntity<ApiResponse<Map<JobSource, Long>>> getSourcePerformance(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            analyticsService.getSourcePerformance(authentication),
            "Source performance fetched successfully"));
  }

  @GetMapping("/skills-gap")
  public ResponseEntity<ApiResponse<List<SkillCount>>> getSkillsGap(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            analyticsService.getSkillsGap(authentication), "Skills gap fetched successfully"));
  }

  @GetMapping("/conversion-funnel")
  public ResponseEntity<ApiResponse<ConversionFunnelResponse>> getConversionFunnel(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            analyticsService.getConversionFunnel(authentication),
            "Conversion funnel fetched successfully"));
  }

  @GetMapping("/referral-effectiveness")
  public ResponseEntity<ApiResponse<ReferralEffectivenessResponse>> getReferralEffectiveness(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            analyticsService.getReferralEffectiveness(authentication),
            "Referral effectiveness fetched successfully"));
  }

  @GetMapping("/time-to-offer")
  public ResponseEntity<ApiResponse<TimeToOfferResponse>> getTimeToOffer(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            analyticsService.getTimeToOffer(authentication), "Time to offer fetched successfully"));
  }
}
