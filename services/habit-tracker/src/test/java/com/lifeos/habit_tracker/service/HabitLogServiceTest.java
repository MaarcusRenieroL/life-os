package com.lifeos.habit_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.habit_tracker.domains.dto.request.CreateHabitLogRequest;
import com.lifeos.habit_tracker.domains.dto.response.HabitStreakResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.exception.InvalidRequestException;
import com.lifeos.habit_tracker.publisher.HabitEventPublisher;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HabitLogServiceTest {

  @Mock private HabitLogRepository habitLogRepository;
  @Mock private HabitService habitService;
  @Mock private StreakService streakService;
  @Mock private HabitEventPublisher habitEventPublisher;
  @InjectMocks private HabitLogService habitLogService;

  private final UUID userId = UUID.randomUUID();
  private final UUID habitId = UUID.randomUUID();

  private Habit habit(LocalDate startDate) {
    return Habit.builder()
        .id(habitId)
        .userId(userId)
        .status(HabitStatus.ACTIVE)
        .frequencyType(FrequencyType.DAILY)
        .startDate(startDate)
        .build();
  }

  @Test
  void upsertUpdatesExistingLogForSameDate() {
    LocalDate logDate = LocalDate.now();
    Habit habit = habit(logDate.minusDays(10));
    when(habitService.findOwned(userId, habitId)).thenReturn(habit);

    HabitLog existing =
        HabitLog.builder()
            .id(UUID.randomUUID())
            .habitId(habitId)
            .userId(userId)
            .logDate(logDate)
            .status(HabitLogStatus.SKIPPED)
            .build();
    when(habitLogRepository.findByHabitIdAndLogDate(habitId, logDate))
        .thenReturn(Optional.of(existing));
    when(habitLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(streakService.recompute(any(), any()))
        .thenReturn(HabitStreakResponse.builder().habitId(habitId).build());

    CreateHabitLogRequest request = new CreateHabitLogRequest();
    setField(request, "logDate", logDate);
    setField(request, "status", HabitLogStatus.COMPLETED);

    var response = habitLogService.upsert(userId, habitId, request);

    assertThat(response.getStatus()).isEqualTo(HabitLogStatus.COMPLETED);
    // Only one row is ever saved for that date - no duplicate row created.
    verify(habitLogRepository, times(1)).save(eq(existing));
  }

  @Test
  void upsertRejectsDateBeforeHabitStart() {
    LocalDate startDate = LocalDate.now().minusDays(5);
    Habit habit = habit(startDate);
    when(habitService.findOwned(userId, habitId)).thenReturn(habit);

    CreateHabitLogRequest request = new CreateHabitLogRequest();
    setField(request, "logDate", startDate.minusDays(1));
    setField(request, "status", HabitLogStatus.COMPLETED);

    assertThatThrownBy(() -> habitLogService.upsert(userId, habitId, request))
        .isInstanceOf(InvalidRequestException.class);

    verify(habitLogRepository, never()).save(any());
  }

  @Test
  void upsertRejectsFutureDate() {
    Habit habit = habit(LocalDate.now().minusDays(30));
    when(habitService.findOwned(userId, habitId)).thenReturn(habit);

    CreateHabitLogRequest request = new CreateHabitLogRequest();
    setField(request, "logDate", LocalDate.now().plusDays(1));
    setField(request, "status", HabitLogStatus.COMPLETED);

    assertThatThrownBy(() -> habitLogService.upsert(userId, habitId, request))
        .isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void logWriteTriggersStreakRecompute() {
    LocalDate logDate = LocalDate.now();
    Habit habit = habit(logDate.minusDays(10));
    when(habitService.findOwned(userId, habitId)).thenReturn(habit);
    when(habitLogRepository.findByHabitIdAndLogDate(habitId, logDate)).thenReturn(Optional.empty());
    when(habitLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(streakService.recompute(any(), any()))
        .thenReturn(HabitStreakResponse.builder().habitId(habitId).build());

    CreateHabitLogRequest request = new CreateHabitLogRequest();
    setField(request, "logDate", logDate);
    setField(request, "status", HabitLogStatus.COMPLETED);

    habitLogService.upsert(userId, habitId, request);

    verify(streakService, times(1)).recompute(userId, habit);
  }

  private void setField(Object target, String fieldName, Object value) {
    try {
      Field field = target.getClass().getDeclaredField(fieldName);
      field.setAccessible(true);
      field.set(target, value);
    } catch (ReflectiveOperationException e) {
      throw new RuntimeException(e);
    }
  }
}
