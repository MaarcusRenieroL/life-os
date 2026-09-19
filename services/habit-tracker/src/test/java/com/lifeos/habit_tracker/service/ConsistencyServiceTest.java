package com.lifeos.habit_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.lifeos.habit_tracker.domains.dto.response.ConsistencyResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.domains.enums.HabitType;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ConsistencyServiceTest {

  @Mock private HabitLogRepository habitLogRepository;

  private ConsistencyService consistencyService;

  private final UUID habitId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    HabitScheduleService habitScheduleService = new HabitScheduleService();
    StreakService streakService =
        new StreakService(habitLogRepository, null, habitScheduleService, null);
    consistencyService = new ConsistencyService(habitLogRepository, habitScheduleService, streakService);
  }

  private HabitLog log(LocalDate date, HabitLogStatus status) {
    return HabitLog.builder().habitId(habitId).logDate(date).status(status).build();
  }

  @Test
  void weeklyConsistencyForDailyHabit() {
    // Reference date is a Wednesday - the ISO week is Mon..Sun, so all 7 days
    // are scheduled for a DAILY habit as long as start date allows it.
    LocalDate wednesday = LocalDate.of(2026, 1, 7);
    LocalDate monday = wednesday.with(DayOfWeek.MONDAY);
    Habit habit =
        Habit.builder()
            .id(habitId)
            .type(HabitType.BINARY)
            .frequencyType(FrequencyType.DAILY)
            .startDate(monday.minusDays(30))
            .build();

    List<HabitLog> logs =
        List.of(
            log(monday, HabitLogStatus.COMPLETED),
            log(monday.plusDays(1), HabitLogStatus.COMPLETED),
            log(monday.plusDays(2), HabitLogStatus.MISSED));
    when(habitLogRepository.findAllByHabitIdAndLogDateBetweenOrderByLogDateAsc(
            habitId, monday, monday.plusDays(6)))
        .thenReturn(logs);

    ConsistencyResponse response = consistencyService.calculate(habit, "week", wednesday);

    // The reference date (Jan 2026) is in the past relative to the actual
    // clock, so the whole Mon..Sun week is in range: 7 scheduled days for a
    // DAILY habit, of which 2 were logged COMPLETED.
    assertThat(response.getScheduledOccurrences()).isEqualTo(7);
    assertThat(response.getCompletions()).isEqualTo(2);
  }

  @Test
  void monthlyConsistencyForWeeklyDaysHabit() {
    // Habit scheduled only on Mondays. A full month of Mondays should each
    // count toward scheduledOccurrences; only logged Mondays count as
    // completions.
    LocalDate referenceDate = LocalDate.of(2026, 1, 31);
    Habit habit =
        Habit.builder()
            .id(habitId)
            .type(HabitType.BINARY)
            .frequencyType(FrequencyType.WEEKLY_DAYS)
            .frequencyConfig(Map.of("daysOfWeek", List.of(1)))
            .startDate(LocalDate.of(2025, 1, 1))
            .build();

    LocalDate monthStart = LocalDate.of(2026, 1, 1);
    LocalDate monthEnd = LocalDate.of(2026, 1, 31);
    List<HabitLog> monthMondays =
        List.of(
            LocalDate.of(2026, 1, 5),
            LocalDate.of(2026, 1, 12),
            LocalDate.of(2026, 1, 19),
            LocalDate.of(2026, 1, 26))
            .stream()
            .map(date -> log(date, HabitLogStatus.COMPLETED))
            .toList();
    when(habitLogRepository.findAllByHabitIdAndLogDateBetweenOrderByLogDateAsc(
            habitId, monthStart, monthEnd))
        .thenReturn(monthMondays);

    ConsistencyResponse response = consistencyService.calculate(habit, "month", referenceDate);

    assertThat(response.getScheduledOccurrences()).isEqualTo(4);
    assertThat(response.getCompletions()).isEqualTo(4);
    assertThat(response.getScore()).isEqualTo(1.0);
  }
}
