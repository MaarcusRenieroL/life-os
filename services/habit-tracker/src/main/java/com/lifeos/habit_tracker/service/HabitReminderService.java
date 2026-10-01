package com.lifeos.habit_tracker.service;

import com.lifeos.habit_tracker.domains.dto.request.CreateHabitReminderRequest;
import com.lifeos.habit_tracker.domains.dto.request.UpdateHabitReminderRequest;
import com.lifeos.habit_tracker.domains.dto.response.HabitReminderResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitReminder;
import com.lifeos.habit_tracker.exception.ResourceNotFoundException;
import com.lifeos.habit_tracker.repository.HabitReminderRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class HabitReminderService {

  private final HabitReminderRepository habitReminderRepository;
  private final HabitService habitService;

  @Transactional(readOnly = true)
  public List<HabitReminderResponse> list(UUID userId, UUID habitId) {
    habitService.findOwned(userId, habitId);
    return habitReminderRepository.findAllByHabitId(habitId).stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public HabitReminderResponse get(UUID userId, UUID habitId, UUID reminderId) {
    habitService.findOwned(userId, habitId);
    return toResponse(findOwnedReminder(habitId, reminderId));
  }

  public HabitReminderResponse create(UUID userId, UUID habitId, CreateHabitReminderRequest request) {
    Habit habit = habitService.findOwned(userId, habitId);

    HabitReminder reminder =
        HabitReminder.builder()
            .habitId(habit.getId())
            .reminderTime(request.getReminderTime())
            .daysOfWeek(request.getDaysOfWeek())
            .enabled(request.getEnabled() == null || request.getEnabled())
            .build();

    return toResponse(habitReminderRepository.save(reminder));
  }

  public HabitReminderResponse update(
      UUID userId, UUID habitId, UUID reminderId, UpdateHabitReminderRequest request) {
    habitService.findOwned(userId, habitId);
    HabitReminder reminder = findOwnedReminder(habitId, reminderId);

    if (request.getReminderTime() != null) {
      reminder.setReminderTime(request.getReminderTime());
    }
    if (request.getDaysOfWeek() != null) {
      reminder.setDaysOfWeek(request.getDaysOfWeek());
    }
    if (request.getEnabled() != null) {
      reminder.setEnabled(request.getEnabled());
    }

    return toResponse(habitReminderRepository.save(reminder));
  }

  public void delete(UUID userId, UUID habitId, UUID reminderId) {
    habitService.findOwned(userId, habitId);
    HabitReminder reminder = findOwnedReminder(habitId, reminderId);
    habitReminderRepository.delete(reminder);
  }

  private HabitReminder findOwnedReminder(UUID habitId, UUID reminderId) {
    return habitReminderRepository
        .findByIdAndHabitId(reminderId, habitId)
        .orElseThrow(() -> ResourceNotFoundException.of("Habit reminder", reminderId));
  }

  private HabitReminderResponse toResponse(HabitReminder reminder) {
    return HabitReminderResponse.builder()
        .id(reminder.getId())
        .habitId(reminder.getHabitId())
        .reminderTime(reminder.getReminderTime())
        .daysOfWeek(reminder.getDaysOfWeek())
        .enabled(reminder.isEnabled())
        .build();
  }
}
