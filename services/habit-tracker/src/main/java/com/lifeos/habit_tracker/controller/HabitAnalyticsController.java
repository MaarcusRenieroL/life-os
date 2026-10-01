package com.lifeos.habit_tracker.controller;

import com.lifeos.common.web.Bounds;
import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.habit_tracker.domains.dto.response.HabitAnalyticsResponse;
import com.lifeos.habit_tracker.domains.dto.response.LoggingTimePatternResponse;
import com.lifeos.habit_tracker.domains.dto.response.WeeklySummaryResponse;
import com.lifeos.habit_tracker.service.HabitAnalyticsService;
import java.time.LocalDate;
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
 * Cross-habit read-only aggregates: the analytics dashboard, the weekly recap, and the
 * logging-time pattern behind the reminder suggestion.
 *
 * <p>These live under {@code /v1/habits/analytics} rather than in {@link HabitController} because
 * they're about the whole set of a user's habits, not one habit. It's a literal path segment, so
 * Spring matches it ahead of {@code HabitController}'s {@code /{id}} template - the same way
 * {@code /today} and {@code /export} already do.
 *
 * <p>The in-app notification feed that used to live here ({@code GET /notifications}) was removed
 * in favour of the global, cross-module notification system in {@code core} (see
 * HabitAttentionScanner/HabitReminderScheduler, which publish
 * HABIT_STREAK_MILESTONE/HABIT_STREAK_AT_RISK/HABIT_REMINDER_DUE to the notification-events
 * pipeline that core consumes and the app's header bell reads, with real read/unread state).
 */
@RestController
@RequestMapping("/v1/habits")
@RequiredArgsConstructor
public class HabitAnalyticsController {

  private final HabitAnalyticsService habitAnalyticsService;

  @GetMapping("/analytics")
  public ResponseEntity<ApiResponse<HabitAnalyticsResponse>> analytics(
      Authentication authentication, @RequestParam(required = false) Integer weeks) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitAnalyticsService.analytics(userId(authentication), weeks == null ? null : Bounds.clamp(weeks, 1, 104)),
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

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
