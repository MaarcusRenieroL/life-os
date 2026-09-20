package com.lifeos.habit_tracker.service;

import com.lifeos.common.events.AuditEventType;
import com.lifeos.habit_tracker.domains.dto.response.HabitStreakResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.entity.HabitStreak;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.publisher.HabitEventPublisher;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitStreakRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Recomputes and caches a habit's streak. Runs synchronously on every log write - never on a
 * plain GET, per the module's design ({@link HabitStreak} is a derived/cached row).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class StreakService {

  // A PARTIAL log only counts toward a streak once its value reaches this
  // fraction of the habit's target_value. Deliberately a hardcoded constant,
  // not a per-user setting - the spec calls out that this must NOT become
  // configurable.
  private static final double PARTIAL_COMPLETION_THRESHOLD = 1.0;

  private static final Set<Integer> MILESTONES = Set.of(7, 30, 100);

  private final HabitLogRepository habitLogRepository;
  private final HabitStreakRepository habitStreakRepository;
  private final HabitScheduleService habitScheduleService;
  private final HabitEventPublisher habitEventPublisher;

  /**
   * Recomputes current/longest streak for a habit from its full log history and upserts the
   * cached {@link HabitStreak} row. Publishes a milestone event if the current streak just
   * crossed 7, 30 or 100.
   *
   * <p>Two near-simultaneous callers for the same habit (e.g. a manual log write racing the
   * nightly missed-habit sweep) can both miss the existing row on habit_id (its primary key) and
   * both attempt an insert; the loser's constraint violation is mapped by GlobalExceptionHandler
   * to a clean 409 rather than an unmapped 500 - see HabitLogService.upsert's javadoc for why a
   * same-transaction retry isn't attempted here instead.
   */
  public HabitStreakResponse recompute(UUID userId, Habit habit) {
    List<HabitLog> logs =
        habitLogRepository.findAllByHabitIdOrderByLogDateAsc(habit.getId());

    HabitStreak existing = habitStreakRepository.findById(habit.getId()).orElse(null);
    int running = 0;
    int longest = existing != null ? existing.getLongestStreak() : 0;
    int previousCurrent = existing != null ? existing.getCurrentStreak() : 0;

    for (HabitLog log : logs) {
      // A day that wasn't actually scheduled per the habit's frequency
      // simply isn't evaluated - it neither breaks nor extends the streak.
      if (!habitScheduleService.isScheduled(habit, log.getLogDate())) {
        continue;
      }

      if (isCounted(habit, log)) {
        running += 1;
        longest = Math.max(longest, running);
      } else if (log.getStatus() == HabitLogStatus.SKIPPED) {
        // Skipped days don't break a streak, but they don't extend it
        // either - the running count simply carries through unchanged.
      } else {
        // MISSED, or PARTIAL below threshold - breaks the streak.
        running = 0;
      }
    }

    HabitStreak streak =
        existing != null ? existing : HabitStreak.builder().habitId(habit.getId()).build();
    streak.setCurrentStreak(running);
    streak.setLongestStreak(longest);
    streak.setLastComputedDate(LocalDate.now());
    habitStreakRepository.save(streak);

    if (running > previousCurrent && MILESTONES.contains(running)) {
      habitEventPublisher.publish(
          userId,
          AuditEventType.HABIT_STREAK_MILESTONE,
          "Habit streak milestone reached",
          Map.of("habitId", habit.getId().toString(), "milestone", String.valueOf(running)));
    }

    return toResponse(streak);
  }

  @Transactional(readOnly = true)
  public HabitStreakResponse get(UUID habitId) {
    return habitStreakRepository
        .findById(habitId)
        .map(this::toResponse)
        .orElseGet(
            () ->
                HabitStreakResponse.builder()
                    .habitId(habitId)
                    .currentStreak(0)
                    .longestStreak(0)
                    .build());
  }

  /** Whether a log counts as a completion for streak purposes. */
  boolean isCounted(Habit habit, HabitLog log) {
    if (log.getStatus() == HabitLogStatus.COMPLETED) {
      return true;
    }
    if (log.getStatus() == HabitLogStatus.PARTIAL) {
      BigDecimal target = habit.getTargetValue();
      BigDecimal value = log.getValue();
      if (target == null || value == null || target.signum() == 0) {
        return false;
      }
      BigDecimal ratio = value.divide(target, 10, java.math.RoundingMode.HALF_UP);
      return ratio.doubleValue() >= PARTIAL_COMPLETION_THRESHOLD;
    }
    return false;
  }

  private HabitStreakResponse toResponse(HabitStreak streak) {
    return HabitStreakResponse.builder()
        .habitId(streak.getHabitId())
        .currentStreak(streak.getCurrentStreak())
        .longestStreak(streak.getLongestStreak())
        .lastComputedDate(streak.getLastComputedDate())
        .build();
  }
}
