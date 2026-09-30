package com.lifeos.workouts.service;

import com.lifeos.workouts.domains.dto.response.WeeklyWorkoutPoint;
import com.lifeos.workouts.domains.dto.response.WorkoutAnalyticsResponse;
import com.lifeos.workouts.domains.entity.SessionSet;
import com.lifeos.workouts.domains.entity.WorkoutSession;
import com.lifeos.workouts.domains.enums.SessionStatus;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.repository.PersonalRecordRepository;
import com.lifeos.workouts.repository.SessionSetRepository;
import com.lifeos.workouts.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Consistency (sessions per week, streaks), volume trend, PR count and average duration - all
 * bucketed into Monday-start weeks in the caller's timezone, since "this week" is the user's
 * week, not the server's. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkoutAnalyticsService {

  // Streaks need more history than a chart shows - a 40-week streak shouldn't read as 12 just
  // because the chart window is 12 weeks.
  private static final int STREAK_LOOKBACK_WEEKS = 104;
  static final int MAX_WEEKS = 52;

  private final WorkoutSessionRepository sessionRepository;
  private final SessionSetRepository setRepository;
  private final PersonalRecordRepository recordRepository;

  public WorkoutAnalyticsResponse analytics(UUID userId, int weeks, int weeklyTarget, ZoneId zone) {
    if (weeks < 1 || weeks > MAX_WEEKS) throw new InvalidRequestException("weeks must be between 1 and " + MAX_WEEKS);
    if (weeklyTarget < 1 || weeklyTarget > 14) throw new InvalidRequestException("target must be between 1 and 14 sessions a week");

    LocalDate thisWeek = LocalDate.now(zone).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    LocalDate lookbackStart = thisWeek.minusWeeks(STREAK_LOOKBACK_WEEKS - 1L);

    List<WorkoutSession> sessions =
        sessionRepository
            .findAllByUserIdAndStatusAndCompletedAtGreaterThanEqual(
                userId, SessionStatus.COMPLETED, lookbackStart.atStartOfDay(zone).toInstant());
    Map<UUID, List<SessionSet>> sets =
        sessions.isEmpty()
            ? Map.of()
            : setRepository.findAllBySessionIdIn(sessions.stream().map(WorkoutSession::getId).toList()).stream()
                .collect(Collectors.groupingBy(SessionSet::getSessionId));

    Map<LocalDate, List<WorkoutSession>> byWeek =
        sessions.stream().collect(Collectors.groupingBy(s -> weekStart(s.getCompletedAt(), zone)));

    List<Integer> sessionCounts = new ArrayList<>();
    List<WeeklyWorkoutPoint> points = new ArrayList<>();
    for (int i = STREAK_LOOKBACK_WEEKS - 1; i >= 0; i--) {
      LocalDate week = thisWeek.minusWeeks(i);
      List<WorkoutSession> inWeek = byWeek.getOrDefault(week, List.of());
      sessionCounts.add(inWeek.size());
      if (i < weeks) {
        BigDecimal volume = BigDecimal.ZERO;
        int seconds = 0;
        for (WorkoutSession s : inWeek) {
          volume = volume.add(volumeOf(sets.getOrDefault(s.getId(), List.of())));
          seconds += s.getDurationSeconds() == null ? 0 : s.getDurationSeconds();
        }
        points.add(new WeeklyWorkoutPoint(week, inWeek.size(), volume, seconds / 60));
      }
    }

    WorkoutStreakCalculator.Streaks streaks = WorkoutStreakCalculator.calculate(sessionCounts, weeklyTarget);

    LocalDate windowStart = thisWeek.minusWeeks(weeks - 1L);
    List<WorkoutSession> windowSessions =
        sessions.stream().filter(s -> !weekStart(s.getCompletedAt(), zone).isBefore(windowStart)).toList();
    int totalSeconds = windowSessions.stream().mapToInt(s -> s.getDurationSeconds() == null ? 0 : s.getDurationSeconds()).sum();
    long prs = recordRepository.countByUserIdAndAchievedAtGreaterThanEqual(userId, windowStart.atStartOfDay(zone).toInstant());

    return new WorkoutAnalyticsResponse(
        weeks,
        windowSessions.size(),
        Math.round(10.0 * windowSessions.size() / weeks) / 10.0,
        windowSessions.isEmpty() ? 0 : Math.round(totalSeconds / 60.0f / windowSessions.size()),
        (int) prs,
        sessionCounts.get(sessionCounts.size() - 1),
        weeklyTarget,
        streaks.current(),
        streaks.longest(),
        points);
  }

  private static LocalDate weekStart(Instant instant, ZoneId zone) {
    return instant.atZone(zone).toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
  }

  private static BigDecimal volumeOf(List<SessionSet> sets) {
    return sets.stream()
        .filter(s -> Boolean.TRUE.equals(s.getCompleted()) && s.getActualWeight() != null && s.getActualReps() != null)
        .map(s -> s.getActualWeight().multiply(BigDecimal.valueOf(s.getActualReps())))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }
}
