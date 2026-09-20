package com.lifeos.habit_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.habit_tracker.domains.dto.response.HabitAnalyticsResponse;
import com.lifeos.habit_tracker.domains.dto.response.HabitNotificationResponse;
import com.lifeos.habit_tracker.domains.dto.response.LoggingTimePatternResponse;
import com.lifeos.habit_tracker.domains.dto.response.WeeklySummaryResponse;
import com.lifeos.habit_tracker.service.HabitAnalyticsService;
import com.lifeos.habit_tracker.service.HabitNotificationService;
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

/**
 * Cross-habit read-only aggregates: the analytics dashboard, the weekly recap, the logging-time
 * pattern behind the reminder suggestion, and the in-app notification feed.
 *
 * <p>These live under {@code /v1/habits/analytics} and {@code /v1/habits/notifications} rather than
 * in {@link HabitController} because they're about the whole set of a user's habits, not one habit.
 * Both are literal path segments, so Spring matches them ahead of {@code HabitController}'s
 * {@code /{id}} template - the same way {@code /today} and {@code /export} already do.
 */
@RestController
@RequestMapping("/v1/habits")
@RequiredArgsConstructor
public class HabitAnalyticsController {

  private final HabitAnalyticsService habitAnalyticsService;
  private final HabitNotificationService habitNotificationService;

  @GetMapping("/analytics")
  public ResponseEntity<ApiResponse<HabitAnalyticsResponse>> analytics(
      Authentication authentication, @RequestParam(required = false) Integer weeks) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitAnalyticsService.analytics(userId(authentication), weeks),
            "Analytics fetched successfully"));
  }

  @GetMapping("/analytics/weekly-summary")
  public ResponseEntity<ApiResponse<WeeklySummaryResponse>> weeklySummary(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitAnalyticsService.weeklySummary(userId(authentication), asOf),
            "Weekly summary fetched successfully"));
  }

  /** {@code zone} is the caller's IANA time zone - {@code logged_at} is an instant, so the "hour
   * of day" histogram is only meaningful once a zone is picked. Defaults to the server's. */
  @GetMapping("/analytics/logging-times")
  public ResponseEntity<ApiResponse<LoggingTimePatternResponse>> loggingTimes(
      Authentication authentication, @RequestParam(required = false) String zone) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitAnalyticsService.loggingTimes(userId(authentication), zone),
            "Logging time pattern fetched successfully"));
  }

  @GetMapping("/notifications")
  public ResponseEntity<ApiResponse<List<HabitNotificationResponse>>> notifications(
      Authentication authentication, @RequestParam(required = false) String zone) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitNotificationService.notifications(userId(authentication), zone),
            "Notifications fetched successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
