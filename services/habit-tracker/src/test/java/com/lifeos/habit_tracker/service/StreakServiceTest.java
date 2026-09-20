package com.lifeos.habit_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.lifeos.habit_tracker.domains.dto.response.HabitStreakResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.entity.HabitStreak;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.domains.enums.HabitType;
import com.lifeos.habit_tracker.publisher.HabitEventPublisher;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitStreakRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class StreakServiceTest {

  @Mock private HabitLogRepository habitLogRepository;
  @Mock private HabitStreakRepository habitStreakRepository;
  @Mock private HabitEventPublisher habitEventPublisher;

  private HabitScheduleService habitScheduleService;
  private StreakService streakService;

  private final UUID userId = UUID.randomUUID();
  private final UUID habitId = UUID.randomUUID();
  private final LocalDate startDate = LocalDate.of(2026, 1, 1);

  @BeforeEach
  void setUp() {
    habitScheduleService = new HabitScheduleService();
    streakService =
        new StreakService(
            habitLogRepository, habitStreakRepository, habitScheduleService, habitEventPublisher);
    when(habitStreakRepository.findById(habitId)).thenReturn(Optional.empty());
  }

  private Habit dailyHabit() {
    return Habit.builder()
        .id(habitId)
        .userId(userId)
        .name("Meditate")
        .type(HabitType.BINARY)
        .frequencyType(FrequencyType.DAILY)
        .startDate(startDate)
        .build();
  }

  private HabitLog log(LocalDate date, HabitLogStatus status) {
    return HabitLog.builder().habitId(habitId).userId(userId).logDate(date).status(status).build();
  }

  /**
   * All of these tests start from no existing {@link com.lifeos.habit_tracker.domains.entity
   * .HabitStreak} row (see setUp()), i.e. a habit's very first recompute - which still takes the
   * original full ascending-history walk (see recomputeFromFullHistory's javadoc), so this stubs
   * that method exactly as before the backward-walk optimization was added.
   */
  private void stubLogsAscending(List<HabitLog> ascendingLogs) {
    when(habitLogRepository.findAllByHabitIdOrderByLogDateAsc(habitId)).thenReturn(ascendingLogs);
  }

  /**
   * Stubs the descending/paged backward walk used once a {@link
   * com.lifeos.habit_tracker.domains.entity.HabitStreak} row already exists. All of these
   * fixtures are small enough to fit on the first page, so a single stub covers every page
   * request.
   */
  private void stubLogsDescending(List<HabitLog> ascendingLogs) {
    List<HabitLog> descending = new ArrayList<>(ascendingLogs);
    Collections.reverse(descending);
    when(habitLogRepository.findAllByHabitIdOrderByLogDateDesc(any(), any(Pageable.class)))
        .thenReturn(descending)
        .thenReturn(List.of());
  }

  @Test
  void consecutiveCompletionsIncrementStreak() {
    Habit habit = dailyHabit();
    List<HabitLog> logs =
        List.of(
            log(startDate, HabitLogStatus.COMPLETED),
            log(startDate.plusDays(1), HabitLogStatus.COMPLETED),
            log(startDate.plusDays(2), HabitLogStatus.COMPLETED));
    stubLogsAscending(logs);
    when(habitStreakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    HabitStreakResponse response = streakService.recompute(userId, habit);

    assertThat(response.getCurrentStreak()).isEqualTo(3);
    assertThat(response.getLongestStreak()).isEqualTo(3);
  }

  @Test
  void skippedDayDoesNotBreakStreak() {
    Habit habit = dailyHabit();
    List<HabitLog> logs =
        List.of(
            log(startDate, HabitLogStatus.COMPLETED),
            log(startDate.plusDays(1), HabitLogStatus.SKIPPED),
            log(startDate.plusDays(2), HabitLogStatus.COMPLETED));
    stubLogsAscending(logs);
    when(habitStreakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    HabitStreakResponse response = streakService.recompute(userId, habit);

    assertThat(response.getCurrentStreak()).isEqualTo(2);
  }

  @Test
  void missedDayResetsStreakToZero() {
    Habit habit = dailyHabit();
    List<HabitLog> logs =
        List.of(
            log(startDate, HabitLogStatus.COMPLETED),
            log(startDate.plusDays(1), HabitLogStatus.COMPLETED),
            log(startDate.plusDays(2), HabitLogStatus.MISSED),
            log(startDate.plusDays(3), HabitLogStatus.COMPLETED));
    stubLogsAscending(logs);
    when(habitStreakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    HabitStreakResponse response = streakService.recompute(userId, habit);

    assertThat(response.getCurrentStreak()).isEqualTo(1);
    assertThat(response.getLongestStreak()).isEqualTo(2);
  }

  @Test
  void partialBelowThresholdBreaksStreak() {
    Habit habit = dailyHabit();
    habit.setTargetValue(BigDecimal.valueOf(10));
    HabitLog partial = log(startDate.plusDays(1), HabitLogStatus.PARTIAL);
    partial.setValue(BigDecimal.valueOf(5));
    List<HabitLog> logs = List.of(log(startDate, HabitLogStatus.COMPLETED), partial);
    stubLogsAscending(logs);
    when(habitStreakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    HabitStreakResponse response = streakService.recompute(userId, habit);

    assertThat(response.getCurrentStreak()).isEqualTo(0);
  }

  @Test
  void partialAtOrAboveThresholdCountsAsCompletion() {
    Habit habit = dailyHabit();
    habit.setTargetValue(BigDecimal.valueOf(10));
    HabitLog partial = log(startDate.plusDays(1), HabitLogStatus.PARTIAL);
    partial.setValue(BigDecimal.valueOf(10));
    List<HabitLog> logs = List.of(log(startDate, HabitLogStatus.COMPLETED), partial);
    stubLogsAscending(logs);
    when(habitStreakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    HabitStreakResponse response = streakService.recompute(userId, habit);

    assertThat(response.getCurrentStreak()).isEqualTo(2);
  }

  @Test
  void longestStreakNeverDecreases() {
    Habit habit = dailyHabit();
    List<HabitLog> logs =
        List.of(
            log(startDate, HabitLogStatus.COMPLETED),
            log(startDate.plusDays(1), HabitLogStatus.COMPLETED),
            log(startDate.plusDays(2), HabitLogStatus.COMPLETED),
            log(startDate.plusDays(3), HabitLogStatus.MISSED));
    stubLogsAscending(logs);
    when(habitStreakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    HabitStreakResponse response = streakService.recompute(userId, habit);

    assertThat(response.getCurrentStreak()).isEqualTo(0);
    assertThat(response.getLongestStreak()).isEqualTo(3);
  }

  @Test
  void unscheduledDaysAreIgnoredEntirely() {
    // WEEKLY_DAYS scheduled only on Mondays (ISO 1). A log on a Tuesday
    // (not scheduled) must not affect the streak at all, even if it's MISSED.
    Habit habit = dailyHabit();
    habit.setFrequencyType(FrequencyType.WEEKLY_DAYS);
    habit.setFrequencyConfig(java.util.Map.of("daysOfWeek", List.of(1)));

    LocalDate monday = LocalDate.of(2026, 1, 5); // a Monday
    LocalDate tuesday = monday.plusDays(1);
    LocalDate nextMonday = monday.plusDays(7);

    List<HabitLog> logs =
        List.of(
            log(monday, HabitLogStatus.COMPLETED),
            log(tuesday, HabitLogStatus.MISSED), // unscheduled day - must be ignored
            log(nextMonday, HabitLogStatus.COMPLETED));
    stubLogsAscending(logs);
    when(habitStreakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    HabitStreakResponse response = streakService.recompute(userId, habit);

    assertThat(response.getCurrentStreak()).isEqualTo(2);
  }

  @Test
  void warmPathWalksBackwardAndKeepsPriorLongest() {
    // An existing HabitStreak row means recompute() takes the bounded backward-walk path instead
    // of the full-history scan. Only the two most recent days should ever be read here.
    Habit habit = dailyHabit();
    when(habitStreakRepository.findById(habitId))
        .thenReturn(
            Optional.of(
                HabitStreak.builder().habitId(habitId).currentStreak(1).longestStreak(5).build()));

    List<HabitLog> recent =
        List.of(
            log(startDate.plusDays(8), HabitLogStatus.COMPLETED),
            log(startDate.plusDays(9), HabitLogStatus.COMPLETED));
    stubLogsDescending(recent);
    when(habitStreakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    HabitStreakResponse response = streakService.recompute(userId, habit);

    assertThat(response.getCurrentStreak()).isEqualTo(2);
    // The freshly computed current (2) is still below the previously recorded longest (5), so
    // the fast path must not clobber it with a value derived only from the recent window.
    assertThat(response.getLongestStreak()).isEqualTo(5);
  }

  @Test
  void warmPathRaisesLongestWhenCurrentSurpassesIt() {
    Habit habit = dailyHabit();
    when(habitStreakRepository.findById(habitId))
        .thenReturn(
            Optional.of(
                HabitStreak.builder().habitId(habitId).currentStreak(2).longestStreak(2).build()));

    List<HabitLog> recent =
        List.of(
            log(startDate.plusDays(8), HabitLogStatus.COMPLETED),
            log(startDate.plusDays(9), HabitLogStatus.COMPLETED),
            log(startDate.plusDays(10), HabitLogStatus.COMPLETED));
    stubLogsDescending(recent);
    when(habitStreakRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    HabitStreakResponse response = streakService.recompute(userId, habit);

    assertThat(response.getCurrentStreak()).isEqualTo(3);
    assertThat(response.getLongestStreak()).isEqualTo(3);
  }
}
