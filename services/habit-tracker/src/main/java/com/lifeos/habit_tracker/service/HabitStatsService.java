package com.lifeos.habit_tracker.service;

import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Per-day and per-habit "scheduled vs done" numbers over a date range, for core's analytics.
 * Uses the same schedule and completion rules as consistency and streaks (HabitScheduleService,
 * StreakService#isCounted) so analytics can't disagree with the habits pages. Only ACTIVE habits,
 * and only days up to today, count. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HabitStatsService {

  public record Day(LocalDate date, int scheduled, int completed) {}

  public record HabitStat(UUID habitId, String name, int scheduled, int completed, int daysSinceLastCompletion) {}

  public record HabitStats(List<Day> days, List<HabitStat> habits) {}

  private final HabitRepository habitRepository;
  private final HabitLogRepository habitLogRepository;
  private final HabitScheduleService scheduleService;
  private final StreakService streakService;

  public HabitStats stats(UUID userId, LocalDate from, LocalDate to) {
    LocalDate today = LocalDate.now();
    LocalDate end = to.isAfter(today) ? today : to;

    List<Habit> habits = habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE);
    Map<UUID, Map<LocalDate, HabitLog>> logs = new HashMap<>();
    for (HabitLog log : habitLogRepository.findAllByUserIdAndLogDateBetween(userId, from.minusDays(60), end)) {
      logs.computeIfAbsent(log.getHabitId(), k -> new HashMap<>()).put(log.getLogDate(), log);
    }

    Map<LocalDate, int[]> byDay = new TreeMap<>();
    for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) byDay.put(d, new int[2]);

    List<HabitStat> perHabit = new ArrayList<>();
    for (Habit habit : habits) {
      Map<LocalDate, HabitLog> habitLogs = logs.getOrDefault(habit.getId(), Map.of());
      int scheduled = 0;
      int completed = 0;
      for (LocalDate d = from; !d.isAfter(end); d = d.plusDays(1)) {
        if (!scheduleService.isScheduled(habit, d)) continue;
        boolean done = habitLogs.containsKey(d) && streakService.isCounted(habit, habitLogs.get(d));
        scheduled++;
        if (done) completed++;
        int[] slot = byDay.get(d);
        slot[0]++;
        if (done) slot[1]++;
      }

      // How long since the habit last counted as done (searching the padded window), so a "you've
      // dropped this" alert doesn't need its own query.
      int idle = -1;
      for (LocalDate d = end; !d.isBefore(from.minusDays(60)); d = d.minusDays(1)) {
        HabitLog log = habitLogs.get(d);
        if (log != null && streakService.isCounted(habit, log)) {
          idle = (int) java.time.temporal.ChronoUnit.DAYS.between(d, today);
          break;
        }
      }
      perHabit.add(new HabitStat(habit.getId(), habit.getName(), scheduled, completed, idle));
    }

    List<Day> days = new ArrayList<>();
    byDay.forEach((date, v) -> days.add(new Day(date, v[0], v[1])));
    return new HabitStats(days, perHabit);
  }
}
