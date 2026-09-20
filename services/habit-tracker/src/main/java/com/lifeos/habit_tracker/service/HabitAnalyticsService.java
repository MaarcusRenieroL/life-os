package com.lifeos.habit_tracker.service;

import com.lifeos.habit_tracker.domains.dto.response.CompletionTrendPointResponse;
import com.lifeos.habit_tracker.domains.dto.response.DayOfWeekPatternResponse;
import com.lifeos.habit_tracker.domains.dto.response.HabitAnalyticsResponse;
import com.lifeos.habit_tracker.domains.dto.response.HabitPerformanceResponse;
import com.lifeos.habit_tracker.domains.dto.response.HealthScoreResponse;
import com.lifeos.habit_tracker.domains.dto.response.HourlyLogCountResponse;
import com.lifeos.habit_tracker.domains.dto.response.LoggingTimePatternResponse;
import com.lifeos.habit_tracker.domains.dto.response.WeeklySummaryResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.entity.HabitStreak;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.exception.InvalidRequestException;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import com.lifeos.habit_tracker.repository.HabitStreakRepository;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cross-habit aggregation for the analytics dashboard and the in-app notification feed.
 *
 * <p>All of this deliberately lives server-side: every figure needs each habit's full log history
 * crossed with its frequency schedule, which as a client-side loop would be one
 * {@code /logs} + {@code /streak} + {@code /consistency} request per habit per view. Here it is two
 * queries total - all of the user's habits, and all of their logs inside the window - with the
 * schedule evaluation done in memory via {@link HabitScheduleService}, the same component
 * {@link StreakService} and {@link ConsistencyService} use, so the three never disagree about what a
 * frequency config means.
 *
 * <p><b>Why some series exclude X_PER_WEEK / X_PER_MONTH habits:</b> those frequency types only
 * carry a target count, never <i>which</i> days it applies to, so a given date can't be called
 * scheduled or missed for them. Any per-day series (the weekly trend, the day-of-week pattern)
 * therefore counts only day-deterministic habits - DAILY, WEEKLY_DAYS and CUSTOM_INTERVAL - and the
 * response reports how many habits that excluded so the UI can say so out loud. Per-habit
 * performance and the health score <i>do</i> include them, scored against their target count per
 * period exactly as {@link ConsistencyService} does.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HabitAnalyticsService {

  private static final int DEFAULT_WEEKS = 12;
  private static final int MAX_WEEKS = 52;

  /** A current streak at or past this many days is treated as fully established. */
  private static final int STREAK_MATURITY_DAYS = 21;

  private static final int CONSISTENCY_WEIGHT = 50;
  private static final int STREAK_WEIGHT = 30;
  private static final int ENGAGEMENT_WEIGHT = 20;

  /** Days of history the reminder-time suggestion looks at. */
  private static final int LOGGING_PATTERN_DAYS = 90;

  /** Below this many completions an "ideal reminder time" would just be noise. */
  private static final int MIN_LOGGING_SAMPLE = 5;

  private final HabitRepository habitRepository;
  private final HabitLogRepository habitLogRepository;
  private final HabitStreakRepository habitStreakRepository;
  private final HabitScheduleService habitScheduleService;
  private final StreakService streakService;

  // ---------------------------------------------------------------- analytics

  @Cacheable(value = "habit-analytics", key = "#userId + ':' + #weeksParam")
  public HabitAnalyticsResponse analytics(UUID userId, Integer weeksParam) {
    int weeks = weeksParam != null ? weeksParam : DEFAULT_WEEKS;
    if (weeks < 1 || weeks > MAX_WEEKS) {
      throw new InvalidRequestException("weeks must be between 1 and " + MAX_WEEKS);
    }

    LocalDate today = LocalDate.now();
    // Whole weeks ending with the current (possibly partial) one, so the trend's
    // last point is the week in progress rather than a stray few days.
    LocalDate windowEnd = today;
    LocalDate windowStart = today.with(DayOfWeek.MONDAY).minusWeeks(weeks - 1L);

    List<Habit> habits = analysableHabits(userId);
    Map<UUID, List<HabitLog>> logsByHabit = logsByHabit(userId, windowStart, windowEnd, habits);
    Map<UUID, HabitStreak> streaks = streaksByHabit(habits);

    List<Habit> dayDeterministic =
        habits.stream().filter(HabitAnalyticsService::isDayDeterministic).toList();

    return HabitAnalyticsResponse.builder()
        .windowStart(windowStart)
        .windowEnd(windowEnd)
        .weeks(weeks)
        .trend(trend(dayDeterministic, logsByHabit, windowStart, windowEnd, weeks))
        .habitPerformance(performance(habits, logsByHabit, streaks, windowStart, windowEnd))
        .dayOfWeekPattern(dayOfWeekPattern(dayDeterministic, logsByHabit, windowStart, windowEnd))
        .healthScore(healthScore(habits, logsByHabit, streaks, windowStart, windowEnd))
        .habitsExcludedFromDayPatterns(habits.size() - dayDeterministic.size())
        .build();
  }

  private List<CompletionTrendPointResponse> trend(
      List<Habit> habits,
      Map<UUID, List<HabitLog>> logsByHabit,
      LocalDate windowStart,
      LocalDate windowEnd,
      int weeks) {
    List<CompletionTrendPointResponse> points = new ArrayList<>(weeks);

    for (int i = 0; i < weeks; i++) {
      LocalDate weekStart = windowStart.plusWeeks(i);
      LocalDate weekEnd = weekStart.plusDays(6);
      int completions = 0;
      int scheduled = 0;

      for (Habit habit : habits) {
        WindowStats stats =
            dayStats(habit, logsByHabit.get(habit.getId()), maxDate(weekStart, windowStart),
                minDate(weekEnd, windowEnd));
        completions += stats.completions();
        scheduled += stats.scheduled();
      }

      points.add(
          CompletionTrendPointResponse.builder()
              .weekStart(weekStart)
              .weekEnd(weekEnd)
              .completions(completions)
              .scheduledOccurrences(scheduled)
              .score(ratio(completions, scheduled))
              .build());
    }

    return points;
  }

  private List<HabitPerformanceResponse> performance(
      List<Habit> habits,
      Map<UUID, List<HabitLog>> logsByHabit,
      Map<UUID, HabitStreak> streaks,
      LocalDate windowStart,
      LocalDate windowEnd) {
    return habits.stream()
        .map(
            habit -> {
              WindowStats stats =
                  windowStats(habit, logsByHabit.get(habit.getId()), windowStart, windowEnd);
              HabitStreak streak = streaks.get(habit.getId());
              return HabitPerformanceResponse.builder()
                  .habitId(habit.getId())
                  .name(habit.getName())
                  .icon(habit.getIcon())
                  .category(habit.getCategory())
                  .completions(stats.completions())
                  .scheduledOccurrences(stats.scheduled())
                  .completionRate(ratio(stats.completions(), stats.scheduled()))
                  .currentStreak(streak != null ? streak.getCurrentStreak() : 0)
                  .longestStreak(streak != null ? streak.getLongestStreak() : 0)
                  .build();
            })
        // Best first. Habits with nothing scheduled in the window sort last rather than
        // tying for either end of the ranking on a vacuous 0/0.
        .sorted(
            Comparator.comparing((HabitPerformanceResponse p) -> p.getScheduledOccurrences() == 0)
                .thenComparing(
                    Comparator.comparingDouble(HabitPerformanceResponse::getCompletionRate).reversed())
                .thenComparing(HabitPerformanceResponse::getName))
        .toList();
  }

  private List<DayOfWeekPatternResponse> dayOfWeekPattern(
      List<Habit> habits,
      Map<UUID, List<HabitLog>> logsByHabit,
      LocalDate windowStart,
      LocalDate windowEnd) {
    int[] completions = new int[8];
    int[] scheduled = new int[8];

    for (Habit habit : habits) {
      Map<LocalDate, HabitLog> byDate = indexByDate(logsByHabit.get(habit.getId()));
      LocalDate start = maxDate(windowStart, habit.getStartDate());
      LocalDate end = habit.getEndDate() != null ? minDate(windowEnd, habit.getEndDate()) : windowEnd;

      for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
        if (!habitScheduleService.isScheduled(habit, date)) {
          continue;
        }
        int isoDay = date.getDayOfWeek().getValue();
        scheduled[isoDay]++;
        HabitLog log = byDate.get(date);
        if (log != null && streakService.isCounted(habit, log)) {
          completions[isoDay]++;
        }
      }
    }

    List<DayOfWeekPatternResponse> pattern = new ArrayList<>(7);
    for (int isoDay = 1; isoDay <= 7; isoDay++) {
      pattern.add(
          DayOfWeekPatternResponse.builder()
              .dayOfWeek(isoDay)
              .completions(completions[isoDay])
              .scheduledOccurrences(scheduled[isoDay])
              .score(ratio(completions[isoDay], scheduled[isoDay]))
              .build());
    }
    return pattern;
  }

  /**
   * Composite score from three measured components. Each one is returned alongside the total, with
   * its weight, so the dashboard can show the arithmetic instead of a magic number.
   */
  private HealthScoreResponse healthScore(
      List<Habit> habits,
      Map<UUID, List<HabitLog>> logsByHabit,
      Map<UUID, HabitStreak> streaks,
      LocalDate windowStart,
      LocalDate windowEnd) {
    List<Habit> active =
        habits.stream().filter(h -> h.getStatus() == HabitStatus.ACTIVE).toList();

    if (active.isEmpty()) {
      return HealthScoreResponse.builder()
          .score(0)
          .consistencyScore(0)
          .streakScore(0)
          .engagementScore(0)
          .consistencyWeightPercent(CONSISTENCY_WEIGHT)
          .streakWeightPercent(STREAK_WEIGHT)
          .engagementWeightPercent(ENGAGEMENT_WEIGHT)
          .habitsCounted(0)
          .build();
    }

    int totalCompletions = 0;
    int totalScheduled = 0;
    double streakSum = 0;
    int engagedHabits = 0;
    LocalDate recentCutoff = windowEnd.minusDays(6);

    for (Habit habit : active) {
      List<HabitLog> logs = logsByHabit.get(habit.getId());
      WindowStats stats = windowStats(habit, logs, windowStart, windowEnd);
      totalCompletions += stats.completions();
      totalScheduled += stats.scheduled();

      HabitStreak streak = streaks.get(habit.getId());
      int current = streak != null ? streak.getCurrentStreak() : 0;
      streakSum += Math.min((double) current / STREAK_MATURITY_DAYS, 1.0);

      if (logs != null
          && logs.stream()
              .anyMatch(
                  log ->
                      !log.getLogDate().isBefore(recentCutoff)
                          && streakService.isCounted(habit, log))) {
        engagedHabits++;
      }
    }

    int consistency = percent(ratio(totalCompletions, totalScheduled));
    int streakComponent = percent(streakSum / active.size());
    int engagement = percent((double) engagedHabits / active.size());

    int total =
        Math.round(
            (consistency * CONSISTENCY_WEIGHT
                    + streakComponent * STREAK_WEIGHT
                    + engagement * ENGAGEMENT_WEIGHT)
                / 100f);

    return HealthScoreResponse.builder()
        .score(total)
        .consistencyScore(consistency)
        .streakScore(streakComponent)
        .engagementScore(engagement)
        .consistencyWeightPercent(CONSISTENCY_WEIGHT)
        .streakWeightPercent(STREAK_WEIGHT)
        .engagementWeightPercent(ENGAGEMENT_WEIGHT)
        .habitsCounted(active.size())
        .build();
  }

  // -------------------------------------------------------- weekly summary

  @Cacheable(value = "habit-weekly-summary", key = "#userId + ':' + #asOf")
  public WeeklySummaryResponse weeklySummary(UUID userId, LocalDate asOf) {
    LocalDate reference = asOf != null ? asOf : LocalDate.now();
    LocalDate weekStart = reference.with(DayOfWeek.MONDAY);
    LocalDate weekEnd = weekStart.plusDays(6);
    LocalDate previousStart = weekStart.minusWeeks(1);

    List<Habit> habits = analysableHabits(userId);
    Map<UUID, List<HabitLog>> logsByHabit = logsByHabit(userId, previousStart, weekEnd, habits);

    // Nothing past today has happened yet, so scoring it would drag the week down
    // for no reason.
    LocalDate today = LocalDate.now();
    LocalDate effectiveEnd = minDate(weekEnd, today.isBefore(weekStart) ? weekEnd : today);

    int completions = 0;
    int scheduled = 0;
    int missed = 0;
    int skipped = 0;
    int tracked = 0;
    HabitPerformanceResponse best = null;
    HabitPerformanceResponse worst = null;

    for (Habit habit : habits) {
      List<HabitLog> logs = logsByHabit.get(habit.getId());
      WindowStats stats = windowStats(habit, logs, weekStart, effectiveEnd);
      completions += stats.completions();
      scheduled += stats.scheduled();

      if (logs != null) {
        for (HabitLog log : logs) {
          if (log.getLogDate().isBefore(weekStart) || log.getLogDate().isAfter(effectiveEnd)) {
            continue;
          }
          if (log.getStatus() == HabitLogStatus.MISSED) {
            missed++;
          } else if (log.getStatus() == HabitLogStatus.SKIPPED) {
            skipped++;
          }
        }
      }

      if (stats.scheduled() == 0) {
        continue;
      }
      tracked++;
      HabitPerformanceResponse entry =
          HabitPerformanceResponse.builder()
              .habitId(habit.getId())
              .name(habit.getName())
              .completionRate(ratio(stats.completions(), stats.scheduled()))
              .build();
      if (best == null || entry.getCompletionRate() > best.getCompletionRate()) {
        best = entry;
      }
      if (worst == null || entry.getCompletionRate() < worst.getCompletionRate()) {
        worst = entry;
      }
    }

    int previousCompletions = 0;
    int previousScheduled = 0;
    for (Habit habit : habits) {
      WindowStats stats =
          windowStats(habit, logsByHabit.get(habit.getId()), previousStart, weekStart.minusDays(1));
      previousCompletions += stats.completions();
      previousScheduled += stats.scheduled();
    }

    return WeeklySummaryResponse.builder()
        .weekStart(weekStart)
        .weekEnd(weekEnd)
        .completions(completions)
        .scheduledOccurrences(scheduled)
        .score(ratio(completions, scheduled))
        .missed(missed)
        .skipped(skipped)
        .perfectDays(perfectDays(habits, logsByHabit, weekStart, effectiveEnd))
        .habitsTracked(tracked)
        .previousWeekScore(ratio(previousCompletions, previousScheduled))
        .topHabitId(best != null ? best.getHabitId() : null)
        .topHabitName(best != null ? best.getName() : null)
        // Only worth calling out when it's genuinely a different habit from the best one.
        .needsAttentionHabitId(worst != null && worst != best ? worst.getHabitId() : null)
        .needsAttentionHabitName(worst != null && worst != best ? worst.getName() : null)
        .build();
  }

  /** Days on which every day-deterministic habit that was scheduled got completed. */
  private int perfectDays(
      List<Habit> habits,
      Map<UUID, List<HabitLog>> logsByHabit,
      LocalDate from,
      LocalDate to) {
    List<Habit> dayHabits =
        habits.stream()
            .filter(HabitAnalyticsService::isDayDeterministic)
            .filter(h -> h.getStatus() != HabitStatus.ARCHIVED)
            .toList();
    if (dayHabits.isEmpty()) {
      return 0;
    }

    Map<UUID, Map<LocalDate, HabitLog>> indexed = new HashMap<>();
    for (Habit habit : dayHabits) {
      indexed.put(habit.getId(), indexByDate(logsByHabit.get(habit.getId())));
    }

    int perfect = 0;
    for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
      int scheduled = 0;
      int completed = 0;
      for (Habit habit : dayHabits) {
        if (!habitScheduleService.isScheduled(habit, date)) {
          continue;
        }
        scheduled++;
        HabitLog log = indexed.get(habit.getId()).get(date);
        if (log != null && streakService.isCounted(habit, log)) {
          completed++;
        }
      }
      if (scheduled > 0 && scheduled == completed) {
        perfect++;
      }
    }
    return perfect;
  }

  // ---------------------------------------------------- logging-time pattern

  /**
   * Histogram of the hour the user logs completions at, plus the modal hour as a suggested reminder
   * time. Hours are bucketed in {@code zoneIdParam} (the caller's browser zone) because
   * {@code logged_at} is an instant and "what hour was that" is only meaningful in a zone.
   */
  public LoggingTimePatternResponse loggingTimes(UUID userId, String zoneIdParam) {
    ZoneId zone;
    try {
      zone = zoneIdParam != null && !zoneIdParam.isBlank() ? ZoneId.of(zoneIdParam) : ZoneId.systemDefault();
    } catch (DateTimeException e) {
      throw new InvalidRequestException("zone must be a valid IANA time zone id");
    }

    LocalDate today = LocalDate.now();
    List<Habit> habits = analysableHabits(userId);
    Map<UUID, Habit> byId = habits.stream().collect(Collectors.toMap(Habit::getId, h -> h));

    int[] counts = new int[24];
    int sample = 0;

    for (HabitLog log :
        habitLogRepository.findAllByUserIdAndLogDateBetween(
            userId, today.minusDays(LOGGING_PATTERN_DAYS), today)) {
      Habit habit = byId.get(log.getHabitId());
      if (habit == null || log.getLoggedAt() == null || !streakService.isCounted(habit, log)) {
        continue;
      }
      counts[log.getLoggedAt().atZone(zone).getHour()]++;
      sample++;
    }

    List<HourlyLogCountResponse> hourly = new ArrayList<>(24);
    int modalHour = -1;
    for (int hour = 0; hour < 24; hour++) {
      hourly.add(HourlyLogCountResponse.builder().hour(hour).completions(counts[hour]).build());
      if (modalHour < 0 || counts[hour] > counts[modalHour]) {
        modalHour = hour;
      }
    }

    return LoggingTimePatternResponse.builder()
        .hourlyCounts(hourly)
        .suggestedReminderTime(
            sample >= MIN_LOGGING_SAMPLE ? LocalTime.of(modalHour, 0) : null)
        .sampleSize(sample)
        .zoneId(zone.getId())
        .build();
  }

  // --------------------------------------------------------------- internals

  /** Archived habits are excluded everywhere - they're deleted as far as the user is concerned. */
  private List<Habit> analysableHabits(UUID userId) {
    return habitRepository.findAllByUserId(userId).stream()
        .filter(h -> h.getStatus() != HabitStatus.ARCHIVED)
        .toList();
  }

  List<Habit> activeHabits(UUID userId) {
    return habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE);
  }

  private Map<UUID, List<HabitLog>> logsByHabit(
      UUID userId, LocalDate from, LocalDate to, List<Habit> habits) {
    if (habits.isEmpty()) {
      return Map.of();
    }
    return habitLogRepository.findAllByUserIdAndLogDateBetween(userId, from, to).stream()
        .collect(Collectors.groupingBy(HabitLog::getHabitId));
  }

  Map<UUID, HabitStreak> streaksByHabit(List<Habit> habits) {
    if (habits.isEmpty()) {
      return Map.of();
    }
    return habitStreakRepository
        .findAllById(habits.stream().map(Habit::getId).toList())
        .stream()
        .collect(Collectors.toMap(HabitStreak::getHabitId, s -> s));
  }

  private static boolean isDayDeterministic(Habit habit) {
    return habit.getFrequencyType() != FrequencyType.X_PER_WEEK
        && habit.getFrequencyType() != FrequencyType.X_PER_MONTH;
  }

  private static Map<LocalDate, HabitLog> indexByDate(List<HabitLog> logs) {
    if (logs == null || logs.isEmpty()) {
      return Map.of();
    }
    return logs.stream().collect(Collectors.toMap(HabitLog::getLogDate, l -> l, (a, b) -> a));
  }

  /**
   * Completions and scheduled occurrences for one habit inside a date range, using the same rules
   * as {@link ConsistencyService}: a day tally for day-deterministic frequencies, and the target
   * count per period for X_PER_WEEK / X_PER_MONTH.
   */
  private WindowStats windowStats(Habit habit, List<HabitLog> logs, LocalDate from, LocalDate to) {
    if (isDayDeterministic(habit)) {
      return dayStats(habit, logs, from, to);
    }
    return targetStats(habit, logs, from, to);
  }

  private WindowStats dayStats(Habit habit, List<HabitLog> logs, LocalDate from, LocalDate to) {
    LocalDate start = maxDate(from, habit.getStartDate());
    LocalDate end = habit.getEndDate() != null ? minDate(to, habit.getEndDate()) : to;
    if (start.isAfter(end)) {
      return new WindowStats(0, 0);
    }

    Map<LocalDate, HabitLog> byDate = indexByDate(logs);
    int scheduled = 0;
    int completions = 0;
    for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
      if (!habitScheduleService.isScheduled(habit, date)) {
        continue;
      }
      scheduled++;
      HabitLog log = byDate.get(date);
      if (log != null && streakService.isCounted(habit, log)) {
        completions++;
      }
    }
    return new WindowStats(completions, scheduled);
  }

  /**
   * X_PER_WEEK / X_PER_MONTH: the target applies to a whole period, so the denominator is the
   * target multiplied by how many periods the range covers (prorated for a part-period at either
   * end, which is what a rolling window almost always produces).
   */
  private WindowStats targetStats(Habit habit, List<HabitLog> logs, LocalDate from, LocalDate to) {
    LocalDate start = maxDate(from, habit.getStartDate());
    LocalDate end = habit.getEndDate() != null ? minDate(to, habit.getEndDate()) : to;
    if (start.isAfter(end)) {
      return new WindowStats(0, 0);
    }

    boolean weekly = habit.getFrequencyType() == FrequencyType.X_PER_WEEK;
    Integer target =
        habitScheduleService.extractInt(
            habit.getFrequencyConfig(), weekly ? "timesPerWeek" : "timesPerMonth");
    if (target == null || target <= 0) {
      return new WindowStats(0, 0);
    }

    long days = ChronoUnit.DAYS.between(start, end) + 1;
    double periodLength = weekly ? 7.0 : 30.0;
    int scheduled = (int) Math.round(target * (days / periodLength));

    int completions = 0;
    if (logs != null) {
      for (HabitLog log : logs) {
        if (log.getLogDate().isBefore(start) || log.getLogDate().isAfter(end)) {
          continue;
        }
        if (streakService.isCounted(habit, log)) {
          completions++;
        }
      }
    }
    return new WindowStats(completions, scheduled);
  }

  private static double ratio(int numerator, int denominator) {
    return denominator > 0 ? (double) numerator / denominator : 0.0;
  }

  private static int percent(double fraction) {
    return (int) Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  }

  private static LocalDate maxDate(LocalDate a, LocalDate b) {
    return a.isAfter(b) ? a : b;
  }

  private static LocalDate minDate(LocalDate a, LocalDate b) {
    return a.isBefore(b) ? a : b;
  }

  /** Completions against scheduled occurrences for one habit over one date range. */
  private record WindowStats(int completions, int scheduled) {}
}
