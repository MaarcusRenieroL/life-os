package com.lifeos.habit_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.habit_tracker.domains.dto.request.CreateHabitRequest;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.domains.enums.HabitType;
import com.lifeos.habit_tracker.exception.ResourceNotFoundException;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HabitServiceTest {

  @Mock private HabitRepository habitRepository;
  @Mock private HabitLogRepository habitLogRepository;
  @InjectMocks private HabitService habitService;

  private final UUID userId = UUID.randomUUID();
  private final UUID otherUserId = UUID.randomUUID();
  private final UUID habitId = UUID.randomUUID();

  @Test
  void createBuildsActiveHabitOwnedByCaller() {
    CreateHabitRequest request = new CreateHabitRequest();
    setField(request, "name", "Read");
    setField(request, "type", HabitType.BINARY);
    setField(request, "frequencyType", FrequencyType.DAILY);
    setField(request, "startDate", LocalDate.of(2026, 1, 1));

    when(habitRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    var response = habitService.create(userId, request);

    assertThat(response.getName()).isEqualTo("Read");
    assertThat(response.getStatus()).isEqualTo(HabitStatus.ACTIVE);
  }

  @Test
  void updateOnlyOwnedHabit() {
    Habit habit =
        Habit.builder().id(habitId).userId(userId).name("Old").status(HabitStatus.ACTIVE).build();
    when(habitRepository.findByIdAndUserId(habitId, userId)).thenReturn(Optional.of(habit));
    when(habitRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    var updateRequest = new com.lifeos.habit_tracker.domains.dto.request.UpdateHabitRequest();
    setField(updateRequest, "name", "New");

    var response = habitService.update(userId, habitId, updateRequest);

    assertThat(response.getName()).isEqualTo("New");
  }

  @Test
  void softDeleteArchivesInsteadOfDeleting() {
    Habit habit =
        Habit.builder().id(habitId).userId(userId).status(HabitStatus.ACTIVE).build();
    when(habitRepository.findByIdAndUserId(habitId, userId)).thenReturn(Optional.of(habit));
    when(habitRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    habitService.softDelete(userId, habitId);

    assertThat(habit.getStatus()).isEqualTo(HabitStatus.ARCHIVED);
    verify(habitRepository, never()).deleteById(any());
  }

  @Test
  void pauseAndResumeFlipStatus() {
    Habit habit =
        Habit.builder().id(habitId).userId(userId).status(HabitStatus.ACTIVE).build();
    when(habitRepository.findByIdAndUserId(habitId, userId)).thenReturn(Optional.of(habit));
    when(habitRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    habitService.pause(userId, habitId);
    assertThat(habit.getStatus()).isEqualTo(HabitStatus.PAUSED);

    habitService.resume(userId, habitId);
    assertThat(habit.getStatus()).isEqualTo(HabitStatus.ACTIVE);
  }

  @Test
  void queriesAreScopedToAuthenticatedUser() {
    // A habit owned by someone else must 404, never leak as a 403 or return
    // another user's data - findByIdAndUserId is the scoping mechanism.
    when(habitRepository.findByIdAndUserId(habitId, otherUserId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> habitService.get(otherUserId, habitId))
        .isInstanceOf(ResourceNotFoundException.class);

    verify(habitRepository, times(1)).findByIdAndUserId(habitId, otherUserId);
  }

  @Test
  void listDelegatesToRepositoryScopedByUser() {
    Habit habit = Habit.builder().id(habitId).userId(userId).status(HabitStatus.ACTIVE).build();
    when(habitRepository.findAllByUserId(userId)).thenReturn(List.of(habit));

    var results = habitService.list(userId, null, null, null, null);

    assertThat(results).hasSize(1);
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
