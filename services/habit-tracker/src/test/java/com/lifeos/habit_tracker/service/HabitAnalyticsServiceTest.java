package com.lifeos.habit_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import com.lifeos.habit_tracker.domains.dto.response.DayOfWeekPatternResponse;
import com.lifeos.habit_tracker.domains.dto.response.HabitAnalyticsResponse;
import com.lifeos.habit_tracker.domains.dto.response.LoggingTimePatternResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.entity.HabitStreak;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.domains.enums.HabitType;
import com.lifeos.habit_tracker.exception.InvalidRequestException;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import com.lifeos.habit_tracker.repository.HabitStreakRepository;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HabitAnalyticsServiceTest {

  @Mock private HabitRepository habitRepository;
  @Mock private HabitLogRepository habitLogRepository;
  @Mock private HabitStreakRepository habitStreakRepository;

  private HabitAnalyticsService habitAnalyticsService;

  private final UUID userId = UUID.randomUUID();
  private final UUID habitId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    HabitScheduleService habitScheduleService = new HabitScheduleService();
    StreakService streakService =
        new StreakService(habitLogRepository, habitStreakRepository, habitScheduleService, null);
    habitAnalyticsService =
        new HabitAnalyticsService(
            habitRepository,
            habitLogRepository,
            habitStreakRepository,
            habitScheduleService,
            streakService);
  }

  private Habit dailyHabit(LocalDate startDate) {
    return Habit.builder()
        .id(habitId)
        .userId(userId)
        .name("Read")
        .type(HabitType.BINARY)
        .status(HabitStatus.ACTIVE)
        .frequencyType(FrequencyType.DAILY)
        .startDate(startDate)
        .build();
  }

  private HabitLog log(LocalDate date, HabitLogStatus status) {
    return HabitLog.builder()
        .habitId(habitId)
        .userId(userId)
        .logDate(date)
        .status(status)
        .loggedAt(date.atTime(20, 15).atZone(ZoneId.of("UTC")).toInstant())
        .build();
  }

  @Test
  void rejectsAnOutOfRangeWindow() {
    Assertions.assertThatThrownBy(() -> habitAnalyticsService.analytics(userId, 0))
        .isInstanceOf(InvalidRequestException.class);
    Assertions.assertThatThrownBy(() -> habitAnalyticsService.analytics(userId, 53))
        .isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void completionRateIsComputedFromRealLogsNotGuessed() {
    LocalDate today = LocalDate.now();
    LocalDate windowStart = today.with(DayOfWeek.MONDAY).minusWeeks(1);
    Habit habit = dailyHabit(windowStart);

    // Every day of the window is scheduled (DAILY); complete exactly the first three.
    List<HabitLog> logs =
        List.of(
            log(windowStart, HabitLogStatus.COMPLETED),
            log(windowStart.plusDays(1), HabitLogStatus.COMPLETED),
            log(windowStart.plusDays(2), HabitLogStatus.COMPLETED),
            log(windowStart.plusDays(3), HabitLogStatus.MISSED));

    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(habit));
    when(habitLogRepository.findAllByUserIdAndLogDateBetween(any(), any(), any())).thenReturn(logs);
    when(habitStreakRepository.findAllById(anyList()))
        .thenReturn(
            List.of(
                HabitStreak.builder().habitId(habitId).currentStreak(3).longestStreak(9).build()));

    HabitAnalyticsResponse response = habitAnalyticsService.analytics(userId, 2);

    int scheduledDays = (int) java.time.temporal.ChronoUnit.DAYS.between(windowStart, today) + 1;
    assertThat(response.getWeeks()).isEqualTo(2);
    assertThat(response.getTrend()).hasSize(2);
    assertThat(response.getHabitPerformance()).hasSize(1);
    assertThat(response.getHabitPerformance().getFirst().getCompletions()).isEqualTo(3);
    assertThat(response.getHabitPerformance().getFirst().getScheduledOccurrences())
        .isEqualTo(scheduledDays);
    assertThat(response.getHabitPerformance().getFirst().getCurrentStreak()).isEqualTo(3);
    assertThat(response.getHabitPerformance().getFirst().getLongestStreak()).isEqualTo(9);

    // Trend totals must agree with the per-habit figures - both come from the same window.
    int trendCompletions = response.getTrend().stream().mapToInt(p -> p.getCompletions()).sum();
    assertThat(trendCompletions).isEqualTo(3);
  }

  @Test
  void dayOfWeekPatternCountsOnlyScheduledDays() {
    LocalDate today = LocalDate.now();
    LocalDate windowStart = today.with(DayOfWeek.MONDAY).minusWeeks(3);

    // Mondays only (ISO day 1).
    Habit habit =
        Habit.builder()
            .id(habitId)
            .userId(userId)
            .name("Gym")
            .type(HabitType.BINARY)
            .status(HabitStatus.ACTIVE)
            .frequencyType(FrequencyType.WEEKLY_DAYS)
            .frequencyConfig(Map.of("daysOfWeek", List.of(1)))
            .startDate(windowStart)
            .build();

    List<HabitLog> logs = new ArrayList<>();
    for (LocalDate date = windowStart; !date.isAfter(today); date = date.plusDays(1)) {
      if (date.getDayOfWeek() == DayOfWeek.MONDAY) {
        logs.add(log(date, HabitLogStatus.COMPLETED));
      }
    }

    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(habit));
    when(habitLogRepository.findAllByUserIdAndLogDateBetween(any(), any(), any())).thenReturn(logs);
    when(habitStreakRepository.findAllById(anyList())).thenReturn(List.of());

    HabitAnalyticsResponse response = habitAnalyticsService.analytics(userId, 4);

    assertThat(response.getDayOfWeekPattern()).hasSize(7);
    DayOfWeekPatternResponse monday = response.getDayOfWeekPattern().getFirst();
    assertThat(monday.getDayOfWeek()).isEqualTo(1);
    assertThat(monday.getScheduledOccurrences()).isEqualTo(logs.size());
    assertThat(monday.getScore()).isEqualTo(1.0);

    // Nothing is scheduled on any other weekday, so those buckets stay empty rather than
    // counting as misses.
    assertThat(response.getDayOfWeekPattern().stream().skip(1))
        .allSatisfy(day -> assertThat(day.getScheduledOccurrences()).isZero());
  }

  @Test
  void xPerWeekHabitsAreExcludedFromDaySeriesButStillRanked() {
    LocalDate today = LocalDate.now();
    Habit habit =
        Habit.builder()
            .id(habitId)
            .userId(userId)
            .name("Run")
            .type(HabitType.BINARY)
            .status(HabitStatus.ACTIVE)
            .frequencyType(FrequencyType.X_PER_WEEK)
            .frequencyConfig(Map.of("timesPerWeek", 3))
            .startDate(today.minusWeeks(1))
            .build();

    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(habit));
    when(habitLogRepository.findAllByUserIdAndLogDateBetween(any(), any(), any()))
        .thenReturn(List.of(log(today, HabitLogStatus.COMPLETED)));
    when(habitStreakRepository.findAllById(anyList())).thenReturn(List.of());

    HabitAnalyticsResponse response = habitAnalyticsService.analytics(userId, 2);

    assertThat(response.getHabitsExcludedFromDayPatterns()).isEqualTo(1);
    assertThat(response.getTrend()).allSatisfy(point -> assertThat(point.getScheduledOccurrences()).isZero());
    // ...but it still gets a real completion rate, scored against its per-week target.
    assertThat(response.getHabitPerformance()).hasSize(1);
    assertThat(response.getHabitPerformance().getFirst().getCompletions()).isEqualTo(1);
    assertThat(response.getHabitPerformance().getFirst().getScheduledOccurrences()).isPositive();
  }

  @Test
  void archivedHabitsAreLeftOutEntirely() {
    Habit archived = dailyHabit(LocalDate.now().minusWeeks(2));
    archived.setStatus(HabitStatus.ARCHIVED);

    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(archived));
    when(habitStreakRepository.findAllById(anyList())).thenReturn(List.of());

    HabitAnalyticsResponse response = habitAnalyticsService.analytics(userId, 4);

    assertThat(response.getHabitPerformance()).isEmpty();
    assertThat(response.getHealthScore().getHabitsCounted()).isZero();
    assertThat(response.getHealthScore().getScore()).isZero();
  }

  @Test
  void healthScoreIsTheWeightedSumOfItsComponents() {
    LocalDate today = LocalDate.now();
    LocalDate windowStart = today.with(DayOfWeek.MONDAY).minusWeeks(1);
    Habit habit = dailyHabit(windowStart);

    List<HabitLog> logs = new ArrayList<>();
    for (LocalDate date = windowStart; !date.isAfter(today); date = date.plusDays(1)) {
      logs.add(log(date, HabitLogStatus.COMPLETED));
    }

    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(habit));
    when(habitLogRepository.findAllByUserIdAndLogDateBetween(any(), any(), any())).thenReturn(logs);
    when(habitStreakRepository.findAllById(anyList()))
        .thenReturn(
            List.of(
                HabitStreak.builder().habitId(habitId).currentStreak(30).longestStreak(30).build()));

    var health = habitAnalyticsService.analytics(userId, 2).getHealthScore();

    // Everything scheduled was completed, the streak is past the 21-day maturity mark and the
    // habit was logged this week, so all three components max out.
    assertThat(health.getConsistencyScore()).isEqualTo(100);
    assertThat(health.getStreakScore()).isEqualTo(100);
    assertThat(health.getEngagementScore()).isEqualTo(100);
    assertThat(health.getScore()).isEqualTo(100);
    assertThat(
            health.getConsistencyWeightPercent()
                + health.getStreakWeightPercent()
                + health.getEngagementWeightPercent())
        .isEqualTo(100);
  }

  @Test
  void suggestedReminderTimeIsTheModalLoggingHourInTheRequestedZone() {
    LocalDate today = LocalDate.now();
    Habit habit = dailyHabit(today.minusDays(30));

    // Six completions, all logged at 20:15 UTC.
    List<HabitLog> logs = new ArrayList<>();
    for (int i = 1; i <= 6; i++) {
      logs.add(log(today.minusDays(i), HabitLogStatus.COMPLETED));
    }

    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(habit));
    when(habitLogRepository.findAllByUserIdAndLogDateBetween(any(), any(), any())).thenReturn(logs);

    LoggingTimePatternResponse pattern = habitAnalyticsService.loggingTimes(userId, "UTC");

    assertThat(pattern.getZoneId()).isEqualTo("UTC");
    assertThat(pattern.getSampleSize()).isEqualTo(6);
    assertThat(pattern.getHourlyCounts()).hasSize(24);
    assertThat(pattern.getSuggestedReminderTime()).isEqualTo(LocalTime.of(20, 0));
  }

  @Test
  void noReminderIsSuggestedBelowTheMinimumSample() {
    LocalDate today = LocalDate.now();
    Habit habit = dailyHabit(today.minusDays(30));

    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(habit));
    when(habitLogRepository.findAllByUserIdAndLogDateBetween(any(), any(), any()))
        .thenReturn(List.of(log(today, HabitLogStatus.COMPLETED)));

    assertThat(habitAnalyticsService.loggingTimes(userId, "UTC").getSuggestedReminderTime()).isNull();
  }

  @Test
  void rejectsAnUnknownTimeZone() {
    Assertions.assertThatThrownBy(() -> habitAnalyticsService.loggingTimes(userId, "Not/AZone"))
        .isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void weeklySummaryCountsMissesSkipsAndPerfectDays() {
    // A fixed past week, so the result doesn't move with the clock.
    LocalDate reference = LocalDate.of(2026, 1, 7);
    LocalDate monday = reference.with(DayOfWeek.MONDAY);
    Habit habit = dailyHabit(monday);

    List<HabitLog> logs =
        List.of(
            log(monday, HabitLogStatus.COMPLETED),
            log(monday.plusDays(1), HabitLogStatus.COMPLETED),
            log(monday.plusDays(2), HabitLogStatus.MISSED),
            log(monday.plusDays(3), HabitLogStatus.SKIPPED));

    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(habit));
    when(habitLogRepository.findAllByUserIdAndLogDateBetween(any(), any(), any())).thenReturn(logs);

    var summary = habitAnalyticsService.weeklySummary(userId, reference);

    assertThat(summary.getWeekStart()).isEqualTo(monday);
    assertThat(summary.getWeekEnd()).isEqualTo(monday.plusDays(6));
    assertThat(summary.getCompletions()).isEqualTo(2);
    assertThat(summary.getScheduledOccurrences()).isEqualTo(7);
    assertThat(summary.getMissed()).isEqualTo(1);
    assertThat(summary.getSkipped()).isEqualTo(1);
    // Only the two fully completed days count as perfect.
    assertThat(summary.getPerfectDays()).isEqualTo(2);
    assertThat(summary.getTopHabitName()).isEqualTo("Read");
  }

  @Test
  void instantsAreBucketedInTheCallersZoneNotTheServers() {
    LocalDate today = LocalDate.now();
    Habit habit = dailyHabit(today.minusDays(30));

    List<HabitLog> logs = new ArrayList<>();
    for (int i = 1; i <= 6; i++) {
      Instant at = today.minusDays(i).atTime(23, 30).atZone(ZoneId.of("UTC")).toInstant();
      logs.add(
          HabitLog.builder()
              .habitId(habitId)
              .userId(userId)
              .logDate(today.minusDays(i))
              .status(HabitLogStatus.COMPLETED)
              .loggedAt(at)
              .build());
    }

    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(habit));
    when(habitLogRepository.findAllByUserIdAndLogDateBetween(any(), any(), any())).thenReturn(logs);

    // 23:30 UTC is 00:30 the next day in Berlin (UTC+1 in winter, +2 in summer), so the two zones
    // must not agree - proving the hour really is computed in the requested zone.
    LocalTime utc = habitAnalyticsService.loggingTimes(userId, "UTC").getSuggestedReminderTime();
    LocalTime berlin = habitAnalyticsService.loggingTimes(userId, "Europe/Berlin").getSuggestedReminderTime();

    assertThat(utc).isEqualTo(LocalTime.of(23, 0));
    assertThat(berlin).isNotEqualTo(utc);
  }
}
