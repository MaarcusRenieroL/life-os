package com.lifeos.habit_tracker.service;

import com.lifeos.common.events.AuditEventType;
import com.lifeos.habit_tracker.domains.dto.request.CreateHabitLogRequest;
import com.lifeos.habit_tracker.domains.dto.request.UpdateHabitLogRequest;
import com.lifeos.habit_tracker.domains.dto.response.HabitLogResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import com.lifeos.habit_tracker.exception.InvalidRequestException;
import com.lifeos.habit_tracker.exception.ResourceNotFoundException;
import com.lifeos.habit_tracker.publisher.HabitEventPublisher;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class HabitLogService {

  private final HabitLogRepository habitLogRepository;
  private final HabitService habitService;
  private final StreakService streakService;
  private final HabitEventPublisher habitEventPublisher;

  /**
   * POST .../logs: upsert on (habitId, logDate) - updates the existing row if one exists.
   *
   * <p>Two concurrent upserts for the same (habitId, logDate) can both miss the row in
   * findByHabitIdAndLogDate and both attempt an insert; the DB's unique constraint on
   * (habit_id, log_date) lets only one through. A same-transaction retry isn't safe here (a
   * constraint violation leaves the persistence context needing a fresh transaction), so the
   * loser's DataIntegrityViolationException is instead mapped by GlobalExceptionHandler to a
   * clean 409 the client can retry, rather than surfacing as an unmapped 500.
   */
  public HabitLogResponse upsert(UUID userId, UUID habitId, CreateHabitLogRequest request) {
    Habit habit = habitService.findOwned(userId, habitId);
    validateBackdating(habit, request.getLogDate());

    HabitLog log =
        habitLogRepository
            .findByHabitIdAndLogDate(habitId, request.getLogDate())
            .orElseGet(
                () ->
                    HabitLog.builder()
                        .habitId(habitId)
                        .userId(userId)
                        .logDate(request.getLogDate())
                        .build());

    log.setStatus(request.getStatus());
    log.setValue(request.getValue());
    log.setFailureReason(request.getFailureReason());
    log.setNote(request.getNote());

    HabitLog saved = habitLogRepository.save(log);
    streakService.recompute(userId, habit);
    publishIfCompleted(userId, saved);

    return toResponse(saved);
  }

  @Transactional(readOnly = true)
  public List<HabitLogResponse> history(UUID userId, UUID habitId, LocalDate from, LocalDate to) {
    Habit habit = habitService.findOwned(userId, habitId);
    LocalDate effectiveFrom = from != null ? from : habit.getStartDate();
    LocalDate effectiveTo = to != null ? to : LocalDate.now();

    return habitLogRepository
        .findAllByHabitIdAndLogDateBetweenOrderByLogDateAsc(habitId, effectiveFrom, effectiveTo)
        .stream()
        .map(this::toResponse)
        .toList();
  }

  public HabitLogResponse update(
      UUID userId, UUID habitId, UUID logId, UpdateHabitLogRequest request) {
    Habit habit = habitService.findOwned(userId, habitId);
    HabitLog log = findOwnedLog(habitId, logId);

    if (request.getStatus() != null) {
      log.setStatus(request.getStatus());
    }
    if (request.getValue() != null) {
      log.setValue(request.getValue());
    }
    if (request.getFailureReason() != null) {
      log.setFailureReason(request.getFailureReason());
    }
    if (request.getNote() != null) {
      log.setNote(request.getNote());
    }

    HabitLog saved = habitLogRepository.save(log);
    streakService.recompute(userId, habit);
    publishIfCompleted(userId, saved);

    return toResponse(saved);
  }

  public void delete(UUID userId, UUID habitId, UUID logId) {
    Habit habit = habitService.findOwned(userId, habitId);
    HabitLog log = findOwnedLog(habitId, logId);

    habitLogRepository.delete(log);
    streakService.recompute(userId, habit);
  }

  private HabitLog findOwnedLog(UUID habitId, UUID logId) {
    return habitLogRepository
        .findByIdAndHabitId(logId, habitId)
        .orElseThrow(() -> ResourceNotFoundException.of("Habit log", logId));
  }

  /** Backdating is allowed anywhere in [habit.startDate, today]; future dates are rejected. */
  private void validateBackdating(Habit habit, LocalDate date) {
    LocalDate today = LocalDate.now();
    if (date.isBefore(habit.getStartDate()) || date.isAfter(today)) {
      throw new InvalidRequestException(
          "logDate must be on or after the habit's start date and not in the future");
    }
  }

  private void publishIfCompleted(UUID userId, HabitLog log) {
    if (log.getStatus() == HabitLogStatus.COMPLETED) {
      habitEventPublisher.publish(
          userId,
          AuditEventType.HABIT_COMPLETED,
          "Habit log completed",
          Map.of(
              "habitId", log.getHabitId().toString(),
              "logDate", log.getLogDate().toString(),
              "value", log.getValue() != null ? log.getValue().toString() : ""));
    }
  }

  private HabitLogResponse toResponse(HabitLog log) {
    return HabitLogResponse.builder()
        .id(log.getId())
        .habitId(log.getHabitId())
        .logDate(log.getLogDate())
        .status(log.getStatus())
        .value(log.getValue())
        .failureReason(log.getFailureReason())
        .note(log.getNote())
        .loggedAt(log.getLoggedAt())
        .updatedAt(log.getUpdatedAt())
        .build();
  }
}
