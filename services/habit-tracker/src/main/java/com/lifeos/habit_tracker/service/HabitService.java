package com.lifeos.habit_tracker.service;

import com.lifeos.habit_tracker.domains.dto.request.CreateHabitRequest;
import com.lifeos.habit_tracker.domains.dto.request.UpdateHabitRequest;
import com.lifeos.habit_tracker.domains.dto.response.HabitLogResponse;
import com.lifeos.habit_tracker.domains.dto.response.HabitResponse;
import com.lifeos.habit_tracker.domains.dto.response.TodayHabitResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.exception.ResourceNotFoundException;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class HabitService {

  private final HabitRepository habitRepository;
  private final HabitLogRepository habitLogRepository;
  private final HabitScheduleService habitScheduleService;

  public List<HabitResponse> list(
      UUID userId, HabitStatus status, String category, UUID areaId, UUID goalId) {
    return habitRepository.findAllByUserId(userId).stream()
        .filter(h -> status == null || h.getStatus() == status)
        .filter(h -> category == null || category.equalsIgnoreCase(h.getCategory()))
        .filter(h -> areaId == null || areaId.equals(h.getAreaId()))
        .filter(h -> goalId == null || goalId.equals(h.getGoalId()))
        .map(this::toResponse)
        .toList();
  }

  public HabitResponse get(UUID userId, UUID id) {
    return toResponse(findOwned(userId, id));
  }

  public Habit findOwned(UUID userId, UUID id) {
    return habitRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Habit", id));
  }

  public HabitResponse create(UUID userId, CreateHabitRequest request) {
    Habit habit =
        Habit.builder()
            .userId(userId)
            .name(request.getName())
            .description(request.getDescription())
            .type(request.getType())
            .category(request.getCategory())
            .areaId(request.getAreaId())
            .goalId(request.getGoalId())
            .frequencyType(request.getFrequencyType())
            .frequencyConfig(request.getFrequencyConfig())
            .targetValue(request.getTargetValue())
            .targetUnit(request.getTargetUnit())
            .status(HabitStatus.ACTIVE)
            .startDate(request.getStartDate())
            .endDate(request.getEndDate())
            .icon(request.getIcon())
            .color(request.getColor())
            .priority(request.getPriority())
            .why(request.getWhy())
            .difficulty(request.getDifficulty())
            .build();

    return toResponse(habitRepository.save(habit));
  }

  public HabitResponse update(UUID userId, UUID id, UpdateHabitRequest request) {
    Habit habit = findOwned(userId, id);

    if (request.getName() != null) {
      habit.setName(request.getName());
    }
    if (request.getDescription() != null) {
      habit.setDescription(request.getDescription());
    }
    if (request.getType() != null) {
      habit.setType(request.getType());
    }
    if (request.getCategory() != null) {
      habit.setCategory(request.getCategory());
    }
    if (request.getAreaId() != null) {
      habit.setAreaId(request.getAreaId());
    }
    if (request.getGoalId() != null) {
      habit.setGoalId(request.getGoalId());
    }
    if (request.getFrequencyType() != null) {
      habit.setFrequencyType(request.getFrequencyType());
    }
    if (request.getFrequencyConfig() != null) {
      habit.setFrequencyConfig(request.getFrequencyConfig());
    }
    if (request.getTargetValue() != null) {
      habit.setTargetValue(request.getTargetValue());
    }
    if (request.getTargetUnit() != null) {
      habit.setTargetUnit(request.getTargetUnit());
    }
    if (request.getStartDate() != null) {
      habit.setStartDate(request.getStartDate());
    }
    if (request.getEndDate() != null) {
      habit.setEndDate(request.getEndDate());
    }
    if (request.getIcon() != null) {
      habit.setIcon(request.getIcon());
    }
    if (request.getColor() != null) {
      habit.setColor(request.getColor());
    }
    if (request.getPriority() != null) {
      habit.setPriority(request.getPriority());
    }
    if (request.getWhy() != null) {
      habit.setWhy(request.getWhy());
    }
    if (request.getDifficulty() != null) {
      habit.setDifficulty(request.getDifficulty());
    }

    return toResponse(habitRepository.save(habit));
  }

  /** Soft delete: archives instead of removing the row, per the module's spec. */
  public void softDelete(UUID userId, UUID id) {
    Habit habit = findOwned(userId, id);
    habit.setStatus(HabitStatus.ARCHIVED);
    habitRepository.save(habit);
  }

  // The pause/resume endpoints only flip `status` - they don't record *which*
  // date range was paused. That means historical streak/consistency
  // recalculation can't retroactively exclude a past pause window; only the
  // real-time behavior while status == PAUSED is honored today (the daily
  // MISSED auto-logging job skips any habit whose status isn't ACTIVE, see
  // MissedHabitScheduler). Tracking paused date ranges would need a new
  // column/table, which is out of scope for this build.
  // TODO(maarcus): pause endpoints don't currently track *which* date ranges
  // were paused, so historical streak/consistency calc can't retroactively
  // exclude a past pause window; only real-time behavior while
  // status==PAUSED is honored (no MISSED auto-logging or streak-break while
  // currently paused).
  public HabitResponse pause(UUID userId, UUID id) {
    Habit habit = findOwned(userId, id);
    habit.setStatus(HabitStatus.PAUSED);
    return toResponse(habitRepository.save(habit));
  }

  public HabitResponse resume(UUID userId, UUID id) {
    Habit habit = findOwned(userId, id);
    habit.setStatus(HabitStatus.ACTIVE);
    return toResponse(habitRepository.save(habit));
  }

  /** All of the user's habits scheduled today, each with today's log status if one exists. */
  @Transactional(readOnly = true)
  public List<TodayHabitResponse> today(UUID userId) {
    LocalDate today = LocalDate.now();
    List<Habit> habits =
        habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE).stream()
            .filter(h -> habitScheduleService.isScheduled(h, today))
            .toList();

    if (habits.isEmpty()) {
      return List.of();
    }

    List<UUID> habitIds = habits.stream().map(Habit::getId).toList();
    Map<UUID, HabitLog> logsByHabitId =
        habitLogRepository.findAllByHabitIdInAndLogDate(habitIds, today).stream()
            .collect(Collectors.toMap(HabitLog::getHabitId, l -> l));

    return habits.stream()
        .map(
            habit -> {
              HabitLog log = logsByHabitId.get(habit.getId());
              return TodayHabitResponse.builder()
                  .habit(toResponse(habit))
                  .todayStatus(log != null ? log.getStatus() : null)
                  .todayLog(log != null ? toLogResponse(log) : null)
                  .build();
            })
        .toList();
  }

  HabitResponse toResponse(Habit habit) {
    return HabitResponse.builder()
        .id(habit.getId())
        .name(habit.getName())
        .description(habit.getDescription())
        .type(habit.getType())
        .category(habit.getCategory())
        .areaId(habit.getAreaId())
        .goalId(habit.getGoalId())
        .frequencyType(habit.getFrequencyType())
        .frequencyConfig(habit.getFrequencyConfig())
        .targetValue(habit.getTargetValue())
        .targetUnit(habit.getTargetUnit())
        .status(habit.getStatus())
        .startDate(habit.getStartDate())
        .endDate(habit.getEndDate())
        .icon(habit.getIcon())
        .color(habit.getColor())
        .priority(habit.getPriority())
        .why(habit.getWhy())
        .difficulty(habit.getDifficulty())
        .createdAt(habit.getCreatedAt())
        .updatedAt(habit.getUpdatedAt())
        .build();
  }

  private HabitLogResponse toLogResponse(HabitLog log) {
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
