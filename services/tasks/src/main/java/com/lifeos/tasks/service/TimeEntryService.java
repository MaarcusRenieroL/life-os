package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.dto.request.StartTimeEntryRequest;
import com.lifeos.tasks.domains.dto.response.TaskTimeSummary;
import com.lifeos.tasks.domains.dto.response.TimeEntryResponse;
import com.lifeos.tasks.domains.entity.TimeEntry;
import com.lifeos.tasks.domains.enums.TimeEntryType;
import com.lifeos.tasks.exception.InvalidRequestException;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.TimeEntryRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Backs a Pomodoro-style timer widget: the frontend owns the actual countdown, this just records
 * each phase's real start/stop boundaries so time can be reviewed later. Deliberately no
 * server-side "which phase comes next" logic - a client-driven countdown that also happens to be
 * mid-flight when the tab is closed shouldn't strand a session in a weird server-side state;
 * start/stop are the only two operations, and starting a new one auto-stops whatever was running. */
@Service
@RequiredArgsConstructor
@Transactional
public class TimeEntryService {

  private final TimeEntryRepository timeEntryRepository;

  @Transactional(readOnly = true)
  public List<TimeEntryResponse> list(UUID userId, Instant from, Instant to, UUID taskId) {
    return timeEntryRepository.findAllByUserId(userId).stream()
        .filter(e -> from == null || e.getStartedAt() == null || !e.getStartedAt().isBefore(from))
        .filter(e -> to == null || e.getStartedAt() == null || !e.getStartedAt().isAfter(to))
        .filter(e -> taskId == null || taskId.equals(e.getTaskId()))
        .sorted((a, b) -> b.getStartedAt().compareTo(a.getStartedAt()))
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public TimeEntryResponse active(UUID userId) {
    return timeEntryRepository.findByUserIdAndEndedAtIsNull(userId).map(this::toResponse).orElse(null);
  }

  /** Starting a new entry while one is already running stops the running one first (at "now",
   * not backdated) - the natural behavior for a work-then-break Pomodoro flow, where the user
   * hitting "start break" is itself the signal that the work phase just ended. */
  public TimeEntryResponse start(UUID userId, StartTimeEntryRequest request) {
    timeEntryRepository.findByUserIdAndEndedAtIsNull(userId).ifPresent(running -> stopInternal(running));

    TimeEntry entry =
        TimeEntry.builder()
            .userId(userId)
            .taskId(request.getTaskId())
            .type(request.getType())
            .startedAt(Instant.now())
            .build();
    return toResponse(timeEntryRepository.save(entry));
  }

  public TimeEntryResponse stop(UUID userId, UUID id) {
    TimeEntry entry =
        timeEntryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Time entry", id));
    if (entry.getEndedAt() != null) {
      throw new InvalidRequestException("This time entry has already been stopped");
    }
    return toResponse(stopInternal(entry));
  }

  private TimeEntry stopInternal(TimeEntry entry) {
    Instant now = Instant.now();
    entry.setEndedAt(now);
    entry.setDurationMinutes((int) Duration.between(entry.getStartedAt(), now).toMinutes());
    return timeEntryRepository.save(entry);
  }

  public void delete(UUID userId, UUID id) {
    TimeEntry entry =
        timeEntryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Time entry", id));
    timeEntryRepository.delete(entry);
  }

  /** Total WORK minutes per task in [from, to) - BREAK sessions and sessions with no taskId are
   * excluded, since "how much time did I spend on this task" is the question this answers. */
  @Transactional(readOnly = true)
  public List<TaskTimeSummary> summaryByTask(UUID userId, Instant from, Instant to) {
    Map<UUID, Long> byTask =
        timeEntryRepository.findAllByUserId(userId).stream()
            .filter(e -> e.getType() == TimeEntryType.WORK)
            .filter(e -> e.getTaskId() != null)
            .filter(e -> e.getDurationMinutes() != null)
            .filter(e -> from == null || !e.getStartedAt().isBefore(from))
            .filter(e -> to == null || !e.getStartedAt().isAfter(to))
            .collect(Collectors.groupingBy(TimeEntry::getTaskId, Collectors.summingLong(TimeEntry::getDurationMinutes)));

    return byTask.entrySet().stream()
        .map(e -> TaskTimeSummary.builder().taskId(e.getKey()).totalMinutes(e.getValue()).build())
        .toList();
  }

  private TimeEntryResponse toResponse(TimeEntry entry) {
    return TimeEntryResponse.builder()
        .id(entry.getId())
        .taskId(entry.getTaskId())
        .type(entry.getType())
        .startedAt(entry.getStartedAt())
        .endedAt(entry.getEndedAt())
        .durationMinutes(entry.getDurationMinutes())
        .notes(entry.getNotes())
        .build();
  }
}
