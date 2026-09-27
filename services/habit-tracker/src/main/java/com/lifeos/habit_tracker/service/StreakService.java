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
import org.springframework.data.domain.PageRequest;
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

  // How many log rows to pull per page while walking backward from today in
  // recompute(). Bounds each page's cost while keeping the number of round
  // trips small for the common case (a streak of a few weeks fits in one page).
  private static final int STREAK_WALK_PAGE_SIZE = 60;

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
   *
   * <p><b>Performance:</b> this used to read a habit's <i>entire</i> log history on every single
   * write, forever, which is O(account age) work for what's almost always a one-day change.
   *
   * <p>Once a {@link HabitStreak} row already exists for the habit (true for every write after the
   * first), it instead walks backward from today in {@value #STREAK_WALK_PAGE_SIZE}-row pages via
   * {@link HabitLogRepository#findAllByHabitIdOrderByLogDateDesc}, stopping as soon as it hits a
   * day that breaks the streak (or runs out of history) - so the read is bounded by the current
   * streak length, not by total history. The longest-streak-ever value is then taken as {@code
   * max(previously recorded longest, newly computed current)} rather than re-derived from a full
   * scan: since the current streak can only ever match or exceed the true max once it's freshly
   * computed, this is exact for the by-far-dominant case (appending/editing near today). The one
   * case it does not correct for is a backdated edit that *shortens* a historical streak episode
   * that isn't part of the current streak but was recorded as the longest - the stored longest
   * won't retroactively drop in that case. This is a deliberate tradeoff to avoid a full-history
   * scan on every write; see the module's audit report for why it was accepted.
   *
   * <p>The very first recompute for a habit (no {@link HabitStreak} row yet) has no prior longest
   * to fall back on, so it still does the original full ascending-history walk once - a one-time
   * cost per habit, not a per-write one.
   */
  public HabitStreakResponse recompute(UUID userId, Habit habit) {
    HabitStreak existing = habitStreakRepository.findById(habit.getId()).orElse(null);
    int previousCurrent = existing != null ? existing.getCurrentStreak() : 0;

    int running;
    int longest;
    if (existing == null) {
      FullScanResult result = recomputeFromFullHistory(habit);
      running = result.current();
      longest = result.longest();
    } else {
      running = recomputeCurrentFromRecentHistory(habit);
      longest = Math.max(existing.getLongestStreak(), running);
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

  /**
   * Current streak only, bounded to roughly the streak's own length: pages backward from today
   * via {@link HabitLogRepository#findAllByHabitIdOrderByLogDateDesc} and stops at the first break.
   */
  private int recomputeCurrentFromRecentHistory(Habit habit) {
    int running = 0;
    boolean broken = false;
    int page = 0;
    walk:
    while (!broken) {
      List<HabitLog> batch =
          habitLogRepository.findAllByHabitIdOrderByLogDateDesc(
              habit.getId(), PageRequest.of(page, STREAK_WALK_PAGE_SIZE));
      if (batch.isEmpty()) {
        // Reached the start of the habit's log history without finding a break.
        break;
      }

      for (HabitLog log : batch) {
        // A day that wasn't actually scheduled per the habit's frequency
        // simply isn't evaluated - it neither breaks nor extends the streak.
        if (!habitScheduleService.isScheduled(habit, log.getLogDate())) {
          continue;
        }

        if (isCounted(habit, log)) {
          running += 1;
        } else if (log.getStatus() == HabitLogStatus.SKIPPED) {
          // Skipped days don't break a streak, but they don't extend it
          // either - the running count simply carries through unchanged.
        } else {
          // MISSED, or PARTIAL below threshold - breaks the streak.
          broken = true;
          break walk;
        }
      }

      if (batch.size() < STREAK_WALK_PAGE_SIZE) {
        // That was the last page - no more history to walk.
        break;
      }
      page++;
    }
    return running;
  }

  /**
   * Original full-history walk, kept only for a habit's very first recompute (no {@link
   * HabitStreak} row yet to seed the fast path with a trustworthy prior longest).
   */
  private FullScanResult recomputeFromFullHistory(Habit habit) {
    List<HabitLog> logs = habitLogRepository.findAllByHabitIdOrderByLogDateAsc(habit.getId());

    int running = 0;
    int longest = 0;
    for (HabitLog log : logs) {
      if (!habitScheduleService.isScheduled(habit, log.getLogDate())) {
        continue;
      }

      if (isCounted(habit, log)) {
        running += 1;
        longest = Math.max(longest, running);
      } else if (log.getStatus() == HabitLogStatus.SKIPPED) {
        // carries through unchanged
      } else {
        running = 0;
      }
    }
    return new FullScanResult(running, longest);
  }

  private record FullScanResult(int current, int longest) {}

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
