package com.lifeos.workouts.service;

import com.lifeos.workouts.domains.dto.request.AddSetRequest;
import com.lifeos.workouts.domains.dto.request.CompleteSessionRequest;
import com.lifeos.workouts.domains.dto.request.ScheduleSessionRequest;
import com.lifeos.workouts.domains.dto.request.StartSessionRequest;
import com.lifeos.workouts.domains.dto.request.UpdateSessionRequest;
import com.lifeos.workouts.domains.dto.request.UpdateSetRequest;
import com.lifeos.workouts.domains.dto.response.GoalWorkoutStatsResponse;
import com.lifeos.workouts.domains.dto.response.SessionDetailResponse;
import com.lifeos.workouts.domains.dto.response.SessionExerciseResponse;
import com.lifeos.workouts.domains.dto.response.SessionSetResponse;
import com.lifeos.workouts.domains.dto.response.SessionSummaryResponse;
import com.lifeos.workouts.domains.entity.Exercise;
import com.lifeos.workouts.domains.entity.Routine;
import com.lifeos.workouts.domains.entity.RoutineExercise;
import com.lifeos.workouts.domains.entity.SessionSet;
import com.lifeos.workouts.domains.entity.WorkoutSession;
import com.lifeos.workouts.domains.enums.SessionStatus;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.exception.ResourceNotFoundException;
import com.lifeos.workouts.integration.WorkoutCalendarSyncService;
import com.lifeos.workouts.repository.ExerciseRepository;
import com.lifeos.workouts.repository.SessionSetRepository;
import com.lifeos.workouts.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The workout lifecycle: PLANNED (scheduled, on the calendar) -> IN_PROGRESS (sets being logged)
 * -> COMPLETED. Only one workout can be in progress at a time, which keeps "resume my workout" a
 * single unambiguous thing. Sets are pre-filled from the routine's targets when a session is
 * created, so logging is "tick it, adjust if it differed" rather than typing every number. */
@Service
@RequiredArgsConstructor
@Transactional
public class SessionService {

  // A scheduled workout is assumed to take an hour on the calendar unless it's actually run.
  private static final Duration PLANNED_LENGTH = Duration.ofHours(1);

  private final WorkoutSessionRepository sessionRepository;
  private final SessionSetRepository setRepository;
  private final ExerciseRepository exerciseRepository;
  private final RoutineService routineService;
  private final ExerciseService exerciseService;
  private final PersonalRecordService personalRecordService;
  private final WorkoutCalendarSyncService calendarSync;

  // ---- queries ----

  @Transactional(readOnly = true)
  public List<SessionSummaryResponse> list(UUID userId, SessionStatus status, Instant from, Instant to) {
    List<WorkoutSession> sessions =
        (status == null ? sessionRepository.findAllByUserId(userId) : sessionRepository.findAllByUserIdAndStatus(userId, status))
            .stream()
            .filter(s -> from == null || (sortInstant(s) != null && !sortInstant(s).isBefore(from)))
            .filter(s -> to == null || (sortInstant(s) != null && sortInstant(s).isBefore(to)))
            .sorted(Comparator.comparing(SessionService::sortInstant, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    Map<UUID, List<SessionSet>> sets = setsBySession(sessions);
    return sessions.stream().map(s -> toSummary(s, sets.getOrDefault(s.getId(), List.of()))).toList();
  }

  @Transactional(readOnly = true)
  public SessionDetailResponse get(UUID userId, UUID id) {
    return detail(userId, findOwned(userId, id));
  }

  /** The session the user is mid-way through, if any - what the "Resume workout" banner reads. */
  @Transactional(readOnly = true)
  public SessionDetailResponse current(UUID userId) {
    return sessionRepository.findFirstByUserIdAndStatus(userId, SessionStatus.IN_PROGRESS).map(s -> detail(userId, s)).orElse(null);
  }

  /** Completed sessions per goal, for the Goals module's progress. Only sessions linked to a goal
   * are counted. */
  @Transactional(readOnly = true)
  public Map<UUID, GoalWorkoutStatsResponse> goalStats(UUID userId) {
    Instant windowStart = Instant.now().minus(Duration.ofDays(28));
    Map<UUID, int[]> counts = new HashMap<>();
    for (WorkoutSession session : sessionRepository.findAllByUserIdAndStatus(userId, SessionStatus.COMPLETED)) {
      if (session.getGoalId() == null) continue;
      int[] entry = counts.computeIfAbsent(session.getGoalId(), k -> new int[2]);
      entry[1]++;
      if (session.getCompletedAt() != null && !session.getCompletedAt().isBefore(windowStart)) entry[0]++;
    }
    return counts.entrySet().stream()
        .collect(Collectors.toMap(Map.Entry::getKey, e -> new GoalWorkoutStatsResponse(e.getValue()[0], e.getValue()[1])));
  }

  // ---- lifecycle ----

  public SessionDetailResponse start(UUID userId, StartSessionRequest request) {
    requireNothingInProgress(userId);
    WorkoutSession session = create(userId, request.routineId(), request.name(), request.goalId(), SessionStatus.IN_PROGRESS);
    session.setStartedAt(Instant.now());
    return detail(userId, sessionRepository.save(session));
  }

  public SessionDetailResponse schedule(UUID userId, ScheduleSessionRequest request) {
    WorkoutSession session = create(userId, request.routineId(), request.name(), request.goalId(), SessionStatus.PLANNED);
    session.setScheduledFor(request.scheduledFor());
    session.setCalendarEventId(
        calendarSync.createEvent(userId, session.getName(), request.scheduledFor(), request.scheduledFor().plus(PLANNED_LENGTH), session.getGoalId()));
    return detail(userId, sessionRepository.save(session));
  }

  /** Begins a scheduled workout - flips it to IN_PROGRESS stamped now. The calendar event stays
   * where it was scheduled until the workout is finished, when it's moved to what really
   * happened. */
  public SessionDetailResponse startPlanned(UUID userId, UUID id) {
    WorkoutSession session = findOwned(userId, id);
    if (session.getStatus() != SessionStatus.PLANNED) {
      throw new InvalidRequestException("Only a scheduled workout can be started this way");
    }
    requireNothingInProgress(userId);
    session.setStatus(SessionStatus.IN_PROGRESS);
    session.setStartedAt(Instant.now());
    return detail(userId, sessionRepository.save(session));
  }

  public SessionDetailResponse update(UUID userId, UUID id, UpdateSessionRequest request) {
    WorkoutSession session = findOwned(userId, id);
    if (request.name() != null && !request.name().isBlank()) session.setName(request.name().trim());
    session.setGoalId(request.goalId());
    session.setNotes(request.notes() == null || request.notes().isBlank() ? null : request.notes().trim());
    if (session.getStatus() == SessionStatus.PLANNED && request.scheduledFor() != null) {
      session.setScheduledFor(request.scheduledFor());
    }
    if (session.getStatus() == SessionStatus.PLANNED && session.getScheduledFor() != null) {
      calendarSync.updateEvent(
          userId, session.getCalendarEventId(), session.getName(), session.getScheduledFor(), session.getScheduledFor().plus(PLANNED_LENGTH), session.getGoalId());
    }
    return detail(userId, sessionRepository.save(session));
  }

  /** Finishes the workout: sets that were never ticked are dropped (a set you didn't do isn't
   * history), the duration is fixed from start to now, and the calendar event is moved to the
   * real time - or created, for a workout that was never scheduled. */
  public SessionDetailResponse complete(UUID userId, UUID id, CompleteSessionRequest request) {
    WorkoutSession session = findOwned(userId, id);
    if (session.getStatus() != SessionStatus.IN_PROGRESS) {
      throw new InvalidRequestException("Only a workout in progress can be completed");
    }
    List<SessionSet> sets = setRepository.findAllBySessionIdOrderByExercisePositionAscSetNumberAsc(id);
    List<SessionSet> done = sets.stream().filter(s -> Boolean.TRUE.equals(s.getCompleted())).toList();
    if (done.isEmpty()) {
      throw new InvalidRequestException("Log at least one set before finishing the workout");
    }
    setRepository.deleteAll(sets.stream().filter(s -> !Boolean.TRUE.equals(s.getCompleted())).toList());

    Instant now = Instant.now();
    session.setStatus(SessionStatus.COMPLETED);
    session.setCompletedAt(now);
    session.setDurationSeconds((int) Math.max(1, Duration.between(session.getStartedAt(), now).getSeconds()));
    if (request != null && request.notes() != null && !request.notes().isBlank()) session.setNotes(request.notes().trim());

    if (session.getCalendarEventId() != null) {
      calendarSync.updateEvent(userId, session.getCalendarEventId(), session.getName(), session.getStartedAt(), now, session.getGoalId());
    } else {
      session.setCalendarEventId(calendarSync.createEvent(userId, session.getName(), session.getStartedAt(), now, session.getGoalId()));
    }
    return detail(userId, sessionRepository.save(session));
  }

  /** Deletes a session at any stage - discarding one in progress, cancelling a scheduled one, or
   * tidying history. Records set during it are taken back with it, so a discarded workout can't
   * leave a personal record behind. */
  public void delete(UUID userId, UUID id) {
    WorkoutSession session = findOwned(userId, id);
    personalRecordService.deleteForSession(id);
    calendarSync.deleteEvent(userId, session.getCalendarEventId());
    sessionRepository.delete(session);
  }

  // ---- sets ----

  public SessionDetailResponse addSet(UUID userId, UUID sessionId, AddSetRequest request) {
    WorkoutSession session = requireInProgress(userId, sessionId);
    Exercise exercise = exerciseService.requireVisible(userId, request.exerciseId());
    List<SessionSet> sets = setRepository.findAllBySessionIdOrderByExercisePositionAscSetNumberAsc(sessionId);

    List<SessionSet> ofExercise = sets.stream().filter(s -> s.getExerciseId().equals(exercise.getId())).toList();
    int position =
        ofExercise.isEmpty()
            ? sets.stream().mapToInt(SessionSet::getExercisePosition).max().orElse(0) + 1
            : ofExercise.get(0).getExercisePosition();
    SessionSet last = ofExercise.isEmpty() ? null : ofExercise.get(ofExercise.size() - 1);

    // A new set starts from the previous one's targets (or what was actually lifted, if that's
    // what was logged) - the usual case is "same again".
    setRepository.save(
        SessionSet.builder()
            .sessionId(sessionId)
            .exerciseId(exercise.getId())
            .exercisePosition(position)
            .setNumber(last == null ? 1 : last.getSetNumber() + 1)
            .targetReps(last == null ? null : last.getActualReps() != null ? last.getActualReps() : last.getTargetReps())
            .targetWeight(last == null ? null : last.getActualWeight() != null ? last.getActualWeight() : last.getTargetWeight())
            .restSeconds(last == null ? null : last.getRestSeconds())
            .build());
    return detail(userId, session);
  }

  public SessionDetailResponse updateSet(UUID userId, UUID sessionId, UUID setId, UpdateSetRequest request) {
    WorkoutSession session = requireInProgress(userId, sessionId);
    SessionSet set = setRepository.findByIdAndSessionId(setId, sessionId).orElseThrow(() -> ResourceNotFoundException.of("Set", setId));

    set.setActualReps(request.actualReps());
    set.setActualWeight(request.actualWeight());
    set.setRestSeconds(request.restSeconds());
    boolean completed = Boolean.TRUE.equals(request.completed());
    if (completed && !Boolean.TRUE.equals(set.getCompleted())) set.setCompletedAt(Instant.now());
    if (!completed) set.setCompletedAt(null);
    set.setCompleted(completed);
    setRepository.save(set);

    refreshRecords(userId, session, set.getExerciseId());
    return detail(userId, session);
  }

  public SessionDetailResponse deleteSet(UUID userId, UUID sessionId, UUID setId) {
    WorkoutSession session = requireInProgress(userId, sessionId);
    SessionSet set = setRepository.findByIdAndSessionId(setId, sessionId).orElseThrow(() -> ResourceNotFoundException.of("Set", setId));
    setRepository.delete(set);

    // Keep set numbers contiguous so "Set 3" never follows "Set 1".
    int number = 1;
    for (SessionSet remaining : setRepository.findAllBySessionIdOrderByExercisePositionAscSetNumberAsc(sessionId)) {
      if (!remaining.getExerciseId().equals(set.getExerciseId())) continue;
      if (remaining.getSetNumber() != number) {
        remaining.setSetNumber(number);
        setRepository.save(remaining);
      }
      number++;
    }
    refreshRecords(userId, session, set.getExerciseId());
    return detail(userId, session);
  }

  // ---- helpers ----

  private WorkoutSession create(UUID userId, UUID routineId, String name, UUID goalId, SessionStatus status) {
    Routine routine = routineId == null ? null : routineService.findOwned(userId, routineId);
    String resolved = name != null && !name.isBlank() ? name.trim() : routine != null ? routine.getName() : "Workout";

    WorkoutSession session =
        sessionRepository.save(
            WorkoutSession.builder().userId(userId).routineId(routineId).name(resolved).status(status).goalId(goalId).build());

    if (routine != null) {
      List<SessionSet> sets = new ArrayList<>();
      for (RoutineExercise re : routineService.exercisesOf(routine.getId())) {
        for (int n = 1; n <= re.getTargetSets(); n++) {
          sets.add(
              SessionSet.builder()
                  .sessionId(session.getId())
                  .exerciseId(re.getExerciseId())
                  .exercisePosition(re.getPosition())
                  .setNumber(n)
                  .targetReps(re.getTargetReps())
                  .targetWeight(re.getTargetWeight())
                  .restSeconds(re.getRestSeconds())
                  .build());
        }
      }
      setRepository.saveAll(sets);
    }
    return session;
  }

  private void requireNothingInProgress(UUID userId) {
    if (sessionRepository.findFirstByUserIdAndStatus(userId, SessionStatus.IN_PROGRESS).isPresent()) {
      throw new InvalidRequestException("You already have a workout in progress - finish or discard it first");
    }
  }

  private WorkoutSession requireInProgress(UUID userId, UUID id) {
    WorkoutSession session = findOwned(userId, id);
    if (session.getStatus() != SessionStatus.IN_PROGRESS) {
      throw new InvalidRequestException("Sets can only be changed while the workout is in progress");
    }
    return session;
  }

  private WorkoutSession findOwned(UUID userId, UUID id) {
    return sessionRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ResourceNotFoundException.of("Workout", id));
  }

  /** Re-derives the personal record for one exercise in this session (see PersonalRecordService)
   * and moves the PR flag to the set that holds it - or clears it if none does. */
  private void refreshRecords(UUID userId, WorkoutSession session, UUID exerciseId) {
    Exercise exercise = exerciseRepository.findById(exerciseId).orElseThrow();
    List<SessionSet> sets =
        setRepository.findAllBySessionIdOrderByExercisePositionAscSetNumberAsc(session.getId()).stream()
            .filter(s -> s.getExerciseId().equals(exerciseId))
            .toList();
    UUID prSetId = personalRecordService.recompute(userId, session, exercise, sets).orElse(null);
    for (SessionSet s : sets) {
      boolean shouldBePr = s.getId().equals(prSetId);
      if (Boolean.TRUE.equals(s.getIsPr()) != shouldBePr) {
        s.setIsPr(shouldBePr);
        setRepository.save(s);
      }
    }
  }

  /** History sorts by when it happened; a planned session by when it's scheduled. */
  private static Instant sortInstant(WorkoutSession s) {
    if (s.getCompletedAt() != null) return s.getCompletedAt();
    if (s.getStartedAt() != null) return s.getStartedAt();
    return s.getScheduledFor();
  }

  private Map<UUID, List<SessionSet>> setsBySession(List<WorkoutSession> sessions) {
    if (sessions.isEmpty()) return Map.of();
    return setRepository.findAllBySessionIdIn(sessions.stream().map(WorkoutSession::getId).toList()).stream()
        .collect(Collectors.groupingBy(SessionSet::getSessionId));
  }

  private SessionDetailResponse detail(UUID userId, WorkoutSession session) {
    List<SessionSet> sets = setRepository.findAllBySessionIdOrderByExercisePositionAscSetNumberAsc(session.getId());
    Map<UUID, Exercise> exercises =
        exerciseRepository.findAllByIdIn(sets.stream().map(SessionSet::getExerciseId).distinct().toList()).stream()
            .collect(Collectors.toMap(Exercise::getId, e -> e));
    Map<UUID, BigDecimal> previousBests = personalRecordService.previousBests(userId, session.getId());

    Map<UUID, List<SessionSet>> byExercise = new java.util.LinkedHashMap<>();
    for (SessionSet set : sets) byExercise.computeIfAbsent(set.getExerciseId(), k -> new ArrayList<>()).add(set);

    List<SessionExerciseResponse> grouped =
        byExercise.entrySet().stream()
            .map(
                entry -> {
                  Exercise exercise = exercises.get(entry.getKey());
                  List<SessionSet> exerciseSets = entry.getValue();
                  return new SessionExerciseResponse(
                      exercise.getId(),
                      exercise.getName(),
                      exercise.getCategory(),
                      exerciseSets.get(0).getExercisePosition(),
                      previousBests.get(exercise.getId()),
                      exerciseSets.stream().map(SessionService::toResponse).toList());
                })
            .sorted(Comparator.comparing(SessionExerciseResponse::position))
            .toList();
    return new SessionDetailResponse(toSummary(session, sets), grouped);
  }

  static SessionSummaryResponse toSummary(WorkoutSession s, List<SessionSet> sets) {
    int completed = 0;
    int prs = 0;
    BigDecimal volume = BigDecimal.ZERO;
    for (SessionSet set : sets) {
      if (!Boolean.TRUE.equals(set.getCompleted())) continue;
      completed++;
      if (Boolean.TRUE.equals(set.getIsPr())) prs++;
      if (set.getActualWeight() != null && set.getActualReps() != null) {
        volume = volume.add(set.getActualWeight().multiply(BigDecimal.valueOf(set.getActualReps())));
      }
    }
    return new SessionSummaryResponse(
        s.getId(),
        s.getName(),
        s.getStatus(),
        s.getRoutineId(),
        s.getGoalId(),
        s.getCalendarEventId(),
        s.getScheduledFor(),
        s.getStartedAt(),
        s.getCompletedAt(),
        s.getDurationSeconds(),
        s.getNotes(),
        sets.size(),
        completed,
        volume,
        prs);
  }

  static SessionSetResponse toResponse(SessionSet set) {
    return new SessionSetResponse(
        set.getId(),
        set.getSetNumber(),
        set.getTargetReps(),
        set.getTargetWeight(),
        set.getActualReps(),
        set.getActualWeight(),
        set.getRestSeconds(),
        Boolean.TRUE.equals(set.getCompleted()),
        set.getCompletedAt(),
        Boolean.TRUE.equals(set.getIsPr()));
  }
}
