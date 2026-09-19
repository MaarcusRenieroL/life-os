package com.lifeos.habit_tracker.scheduler;

import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import com.lifeos.habit_tracker.service.HabitScheduleService;
import com.lifeos.habit_tracker.service.StreakService;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Daily sweep: any ACTIVE habit that was scheduled yesterday and has no log for yesterday gets an
 * auto-inserted MISSED log, which then triggers a streak recompute for that habit. Habits with
 * status != ACTIVE (e.g. PAUSED) are skipped entirely - per the module's pause semantics, a
 * currently-paused habit shouldn't accrue MISSED logs.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MissedHabitScheduler {

  private final HabitRepository habitRepository;
  private final HabitLogRepository habitLogRepository;
  private final HabitScheduleService habitScheduleService;
  private final StreakService streakService;

  @Scheduled(cron = "${habit.missed-log.cron:0 5 0 * * *}")
  @Transactional
  public void autoLogMissedHabits() {
    LocalDate yesterday = LocalDate.now().minusDays(1);
    List<Habit> activeHabits = habitRepository.findAllByStatus(HabitStatus.ACTIVE);
    int inserted = 0;

    // TODO(maarcus): consider batching if habit count grows large - this
    // processes one habit (and one streak recompute) at a time rather than a
    // bulk insert + bulk recompute. Simplest-correct over premature
    // optimization for the current expected scale.
    for (Habit habit : activeHabits) {
      // X_PER_WEEK/X_PER_MONTH have a target count but no fixed day assignment, so there's no
      // single "day" that was actually missed - auto-inserting a MISSED log for every unlogged
      // day would falsely break the streak even when the user is on track to hit their weekly/
      // monthly target. These frequency types are tracked purely by what the user explicitly
      // logs; see ConsistencyService's dedicated branch for how their progress is scored instead.
      if (habit.getFrequencyType() == FrequencyType.X_PER_WEEK
          || habit.getFrequencyType() == FrequencyType.X_PER_MONTH) {
        continue;
      }
      if (!habitScheduleService.isScheduled(habit, yesterday)) {
        continue;
      }
      if (habitLogRepository.findByHabitIdAndLogDate(habit.getId(), yesterday).isPresent()) {
        continue;
      }

      HabitLog missed =
          HabitLog.builder()
              .habitId(habit.getId())
              .userId(habit.getUserId())
              .logDate(yesterday)
              .status(HabitLogStatus.MISSED)
              .build();
      habitLogRepository.save(missed);
      streakService.recompute(habit.getUserId(), habit);
      inserted++;
    }

    if (inserted > 0) {
      log.info("Auto-logged {} missed habits for {}", inserted, yesterday);
    }
  }
}
