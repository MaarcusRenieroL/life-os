package com.lifeos.habit_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.entity.HabitReminder;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.domains.enums.HabitType;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitReminderRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InternalTodayServiceTest {

  @Mock private HabitRepository habitRepository;
  @Mock private HabitLogRepository habitLogRepository;
  @Mock private HabitReminderRepository habitReminderRepository;

  private HabitScheduleService habitScheduleService;
  private InternalTodayService internalTodayService;

  private final UUID userId = UUID.randomUUID();
  private final UUID habitId = UUID.randomUUID();
  private final LocalDate today = LocalDate.now();

  @BeforeEach
  void setUp() {
    habitScheduleService = new HabitScheduleService();
    internalTodayService =
        new InternalTodayService(
            habitRepository, habitLogRepository, habitReminderRepository, habitScheduleService);
  }

  private Habit dailyHabit() {
    return Habit.builder()
        .id(habitId)
        .userId(userId)
        .name("Meditate")
        .why("Stay calm")
        .type(HabitType.BINARY)
        .frequencyType(FrequencyType.DAILY)
        .startDate(today.minusDays(30))
        .build();
  }

  @Test
  void returnsHabitDueItemWhenNotLoggedToday() {
    when(habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE))
        .thenReturn(List.of(dailyHabit()));
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(List.of());
    when(habitReminderRepository.findAllByHabitIdIn(List.of(habitId))).thenReturn(List.of());

    List<TodayItemResponse> items = internalTodayService.today(userId);

    assertThat(items).hasSize(1);
    TodayItemResponse item = items.get(0);
    assertThat(item.getModule()).isEqualTo("habit-tracker");
    assertThat(item.getType()).isEqualTo("habit_due");
    assertThat(item.getTitle()).isEqualTo("Meditate");
    assertThat(item.getEntityId()).isEqualTo(habitId.toString());
  }

  @Test
  void omitsHabitDueItemWhenAlreadyLoggedToday() {
    when(habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE))
        .thenReturn(List.of(dailyHabit()));
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(
            List.of(
                HabitLog.builder()
                    .habitId(habitId)
                    .userId(userId)
                    .logDate(today)
                    .status(HabitLogStatus.COMPLETED)
                    .build()));
    when(habitReminderRepository.findAllByHabitIdIn(List.of(habitId))).thenReturn(List.of());

    List<TodayItemResponse> items = internalTodayService.today(userId);

    assertThat(items).isEmpty();
  }

  @Test
  void includesUpcomingReminderItem() {
    when(habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE))
        .thenReturn(List.of(dailyHabit()));
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(
            List.of(
                HabitLog.builder()
                    .habitId(habitId)
                    .userId(userId)
                    .logDate(today)
                    .status(HabitLogStatus.COMPLETED)
                    .build()));
    HabitReminder reminder =
        HabitReminder.builder()
            .id(UUID.randomUUID())
            .habitId(habitId)
            .reminderTime(LocalTime.of(23, 59))
            .enabled(true)
            .build();
    when(habitReminderRepository.findAllByHabitIdIn(List.of(habitId))).thenReturn(List.of(reminder));

    List<TodayItemResponse> items = internalTodayService.today(userId);

    assertThat(items).hasSize(1);
    assertThat(items.get(0).getType()).isEqualTo("habit_reminder_upcoming");
  }

  @Test
  void excludesDisabledReminders() {
    when(habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE))
        .thenReturn(List.of(dailyHabit()));
    when(habitLogRepository.findAllByHabitIdInAndLogDate(List.of(habitId), today))
        .thenReturn(
            List.of(
                HabitLog.builder()
                    .habitId(habitId)
                    .userId(userId)
                    .logDate(today)
                    .status(HabitLogStatus.COMPLETED)
                    .build()));
    // The repository query itself only returns enabled reminders in production (findAllByHabitIdIn
    // has no enabled filter at the query level), so the service must filter client-side - assert
    // that filter here by returning a disabled reminder and expecting it to be dropped.
    HabitReminder disabled =
        HabitReminder.builder()
            .id(UUID.randomUUID())
            .habitId(habitId)
            .reminderTime(LocalTime.of(23, 59))
            .enabled(false)
            .build();
    when(habitReminderRepository.findAllByHabitIdIn(List.of(habitId))).thenReturn(List.of(disabled));

    List<TodayItemResponse> items = internalTodayService.today(userId);

    assertThat(items).isEmpty();
  }

  @Test
  void isUpcomingTodayIsFalseForPastReminderTime() {
    HabitReminder reminder =
        HabitReminder.builder().habitId(habitId).reminderTime(LocalTime.of(6, 0)).enabled(true).build();

    boolean upcoming =
        internalTodayService.isUpcomingToday(reminder, LocalTime.of(12, 0), today.getDayOfWeek().getValue());

    assertThat(upcoming).isFalse();
  }

  @Test
  void isUpcomingTodayIsFalseWhenDayOfWeekDoesNotMatch() {
    int otherDay = today.getDayOfWeek().getValue() % 7 + 1;
    HabitReminder reminder =
        HabitReminder.builder()
            .habitId(habitId)
            .reminderTime(LocalTime.of(20, 0))
            .daysOfWeek(List.of(otherDay))
            .enabled(true)
            .build();

    boolean upcoming =
        internalTodayService.isUpcomingToday(reminder, LocalTime.of(12, 0), today.getDayOfWeek().getValue());

    assertThat(upcoming).isFalse();
  }

  @Test
  void isLateInDayIsFalseBeforeThresholdAndTrueAtOrAfter() {
    assertThat(internalTodayService.isLateInDay(LocalTime.of(17, 59))).isFalse();
    assertThat(internalTodayService.isLateInDay(LocalTime.of(18, 0))).isTrue();
    assertThat(internalTodayService.isLateInDay(LocalTime.of(23, 0))).isTrue();
  }
}
