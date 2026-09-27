package com.lifeos.habit_tracker.scheduler;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.entity.HabitStreak;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.domains.enums.HabitType;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import com.lifeos.habit_tracker.repository.HabitStreakRepository;
import com.lifeos.habit_tracker.service.HabitScheduleService;
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
class HabitAttentionScannerTest {

  @Mock private HabitRepository habitRepository;
  @Mock private HabitStreakRepository habitStreakRepository;
  @Mock private HabitLogRepository habitLogRepository;
  @Mock private NotificationEventPublisher notificationEventPublisher;

  private HabitScheduleService habitScheduleService;
  private HabitAttentionScanner scanner;

  private final UUID userId = UUID.randomUUID();
  private final UUID habitId = UUID.randomUUID();
  private final LocalDate today = LocalDate.now();

  @BeforeEach
  void setUp() {
    habitScheduleService = new HabitScheduleService();
    scanner =
        new HabitAttentionScanner(
            habitRepository,
            habitStreakRepository,
            habitLogRepository,
            habitScheduleService,
            notificationEventPublisher);
  }

  private Habit dailyHabit() {
    return Habit.builder()
        .id(habitId)
        .userId(userId)
        .name("Meditate")
        .type(HabitType.BINARY)
        .frequencyType(FrequencyType.DAILY)
        .startDate(today.minusDays(30))
        .build();
  }

  private void stubScheduledHabits(Habit... habits) {
    when(habitRepository.findAllByStatus(HabitStatus.ACTIVE)).thenReturn(List.of(habits));
  }

  @Test
  void publishesAtRiskWhenStreakActiveAndNotLoggedToday() {
    stubScheduledHabits(dailyHabit());
    when(habitStreakRepository.findAllById(List.of(habitId)))
        .thenReturn(List.of(HabitStreak.builder().habitId(habitId).currentStreak(5).build()));
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(List.of());

    scanner.scan();

    verify(notificationEventPublisher)
        .publish(
            eq(userId),
            eq(NotificationEventType.HABIT_STREAK_AT_RISK),
            contains("5-day streak"),
            any(),
            any());
  }

  @Test
  void doesNotPublishAtRiskWhenAlreadyLoggedToday() {
    stubScheduledHabits(dailyHabit());
    when(habitStreakRepository.findAllById(List.of(habitId)))
        .thenReturn(List.of(HabitStreak.builder().habitId(habitId).currentStreak(5).build()));
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(
            List.of(
                HabitLog.builder()
                    .habitId(habitId)
                    .userId(userId)
                    .logDate(today)
                    .status(HabitLogStatus.COMPLETED)
                    .build()));

    scanner.scan();

    verify(notificationEventPublisher, never())
        .publish(any(), eq(NotificationEventType.HABIT_STREAK_AT_RISK), any(), any(), any());
  }

  @Test
  void doesNotPublishAtRiskWhenStreakIsZero() {
    stubScheduledHabits(dailyHabit());
    when(habitStreakRepository.findAllById(List.of(habitId)))
        .thenReturn(List.of(HabitStreak.builder().habitId(habitId).currentStreak(0).build()));
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(List.of());

    scanner.scan();

    verify(notificationEventPublisher, never())
        .publish(any(), eq(NotificationEventType.HABIT_STREAK_AT_RISK), any(), any(), any());
  }

  @Test
  void skipsHabitsWithNoStreakRowYet() {
    stubScheduledHabits(dailyHabit());
    when(habitStreakRepository.findAllById(List.of(habitId))).thenReturn(List.of());
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(List.of());

    scanner.scan();

    verify(notificationEventPublisher, never())
        .publish(any(), any(), any(), any(), any(Map.class));
  }

  @Test
  void skipsHabitsNotScheduledToday() {
    Habit weeklyHabit = dailyHabit();
    weeklyHabit.setFrequencyType(FrequencyType.WEEKLY_DAYS);
    // Scheduled only on a day-of-week that isn't today.
    int notToday = today.getDayOfWeek().getValue() % 7 + 1;
    weeklyHabit.setFrequencyConfig(Map.of("daysOfWeek", List.of(notToday)));
    stubScheduledHabits(weeklyHabit);

    scanner.scan();

    verify(habitStreakRepository, never()).findAllById(any());
    verify(notificationEventPublisher, never())
        .publish(any(), any(), any(), any(), any(Map.class));
  }

  @Test
  void publishesMilestoneAtExactly7() {
    stubScheduledHabits(dailyHabit());
    when(habitStreakRepository.findAllById(List.of(habitId)))
        .thenReturn(List.of(HabitStreak.builder().habitId(habitId).currentStreak(7).build()));
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(List.of());

    scanner.scan();

    verify(notificationEventPublisher)
        .publish(
            eq(userId),
            eq(NotificationEventType.HABIT_STREAK_MILESTONE),
            contains("7-day streak"),
            any(),
            any());
  }

  @Test
  void doesNotPublishMilestoneAtNonMilestoneValue() {
    stubScheduledHabits(dailyHabit());
    when(habitStreakRepository.findAllById(List.of(habitId)))
        .thenReturn(List.of(HabitStreak.builder().habitId(habitId).currentStreak(8).build()));
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(List.of());

    scanner.scan();

    verify(notificationEventPublisher, never())
        .publish(any(), eq(NotificationEventType.HABIT_STREAK_MILESTONE), any(), any(), any());
  }
}
