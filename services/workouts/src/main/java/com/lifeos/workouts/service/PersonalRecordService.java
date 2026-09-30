package com.lifeos.workouts.service;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.workouts.domains.dto.response.ExerciseRecordsResponse;
import com.lifeos.workouts.domains.dto.response.PersonalRecordResponse;
import com.lifeos.workouts.domains.entity.Exercise;
import com.lifeos.workouts.domains.entity.PersonalRecord;
import com.lifeos.workouts.domains.entity.SessionSet;
import com.lifeos.workouts.domains.entity.WorkoutSession;
import com.lifeos.workouts.repository.ExerciseRepository;
import com.lifeos.workouts.repository.PersonalRecordRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A personal record is the heaviest weight lifted for an exercise (reps don't compete - a
 * heavier single beats a lighter set of ten). A session earns at most one record per exercise:
 * its heaviest completed set, and only if that beats everything lifted before the session. So a
 * workout that ramps 80 -> 85 -> 90 kg is one PR at 90, not three.
 *
 * <p>Because of that, records are recomputed for an exercise whenever one of its sets changes
 * rather than patched incrementally - un-ticking, re-weighing or deleting a set can't leave a
 * stale record behind, and re-saving an unchanged set is a no-op. */
@Service
@RequiredArgsConstructor
@Transactional
public class PersonalRecordService {

  private final PersonalRecordRepository recordRepository;
  private final ExerciseRepository exerciseRepository;
  private final NotificationEventPublisher notificationEventPublisher;

  /** Re-derives this session's record for one exercise from its current sets and returns the set
   * that holds it (empty if none of them is a record). A notification goes out only when a
   * previously-recorded best is beaten by a heavier lift than this session had already logged -
   * the very first weight logged for an exercise is a baseline, not an achievement, and nudging a
   * weight up mid-session doesn't re-notify. */
  public Optional<UUID> recompute(UUID userId, WorkoutSession session, Exercise exercise, List<SessionSet> setsOfExercise) {
    List<PersonalRecord> all = recordRepository.findAllByUserIdAndExerciseId(userId, exercise.getId());
    Optional<PersonalRecord> priorBest =
        all.stream().filter(r -> !session.getId().equals(r.getSessionId())).max(Comparator.comparing(PersonalRecord::getWeight));
    Optional<BigDecimal> ownBefore =
        all.stream().filter(r -> session.getId().equals(r.getSessionId())).map(PersonalRecord::getWeight).max(Comparator.naturalOrder());

    recordRepository.deleteAllBySessionIdAndExerciseId(session.getId(), exercise.getId());

    Optional<SessionSet> heaviest =
        setsOfExercise.stream().filter(PersonalRecordService::qualifies).max(Comparator.comparing(SessionSet::getActualWeight));
    if (heaviest.isEmpty()) return Optional.empty();

    SessionSet set = heaviest.get();
    if (priorBest.isPresent() && set.getActualWeight().compareTo(priorBest.get().getWeight()) <= 0) return Optional.empty();

    recordRepository.save(
        PersonalRecord.builder()
            .userId(userId)
            .exerciseId(exercise.getId())
            .weight(set.getActualWeight())
            .reps(set.getActualReps())
            .achievedAt(set.getCompletedAt() == null ? Instant.now() : set.getCompletedAt())
            .sessionId(session.getId())
            .build());

    boolean improvedOnThisSession = ownBefore.isEmpty() || set.getActualWeight().compareTo(ownBefore.get()) > 0;
    if (priorBest.isPresent() && improvedOnThisSession) {
      notificationEventPublisher.publish(
          userId,
          NotificationEventType.WORKOUT_PERSONAL_RECORD,
          "New PR: " + exercise.getName(),
          plain(set.getActualWeight()) + " kg × " + set.getActualReps() + " (previous best " + plain(priorBest.get().getWeight()) + " kg)",
          Map.of("exerciseId", exercise.getId().toString(), "sessionId", session.getId().toString()));
    }
    return Optional.of(set.getId());
  }

  public void deleteForSession(UUID sessionId) {
    recordRepository.deleteAllBySessionId(sessionId);
  }

  /** Heaviest weight recorded for each exercise before `excludingSessionId` - what a session's
   * logging screen shows as the number to beat. */
  @Transactional(readOnly = true)
  public Map<UUID, BigDecimal> previousBests(UUID userId, UUID excludingSessionId) {
    return recordRepository.findAllByUserIdOrderByAchievedAtDesc(userId).stream()
        .filter(r -> !excludingSessionId.equals(r.getSessionId()))
        .collect(Collectors.toMap(PersonalRecord::getExerciseId, PersonalRecord::getWeight, BigDecimal::max));
  }

  @Transactional(readOnly = true)
  public List<ExerciseRecordsResponse> list(UUID userId) {
    List<PersonalRecord> all = recordRepository.findAllByUserIdOrderByAchievedAtDesc(userId);
    Map<UUID, Exercise> exercises =
        exerciseRepository.findAllByIdIn(all.stream().map(PersonalRecord::getExerciseId).distinct().toList()).stream()
            .collect(Collectors.toMap(Exercise::getId, e -> e));

    return all.stream()
        .collect(Collectors.groupingBy(PersonalRecord::getExerciseId))
        .entrySet()
        .stream()
        .map(
            entry -> {
              Exercise exercise = exercises.get(entry.getKey());
              List<PersonalRecordResponse> history =
                  entry.getValue().stream().map(r -> toResponse(r, exercise.getName())).toList();
              PersonalRecordResponse best = history.stream().max(Comparator.comparing(PersonalRecordResponse::weight)).orElseThrow();
              return new ExerciseRecordsResponse(exercise.getId(), exercise.getName(), exercise.getCategory(), best, history);
            })
        .sorted(Comparator.comparing(ExerciseRecordsResponse::exerciseName, String.CASE_INSENSITIVE_ORDER))
        .toList();
  }

  /** Only a completed set with a real weight and at least one rep can be a record. */
  static boolean qualifies(SessionSet set) {
    return Boolean.TRUE.equals(set.getCompleted())
        && set.getActualWeight() != null
        && set.getActualWeight().signum() > 0
        && set.getActualReps() != null
        && set.getActualReps() >= 1;
  }

  private static String plain(BigDecimal value) {
    return value.stripTrailingZeros().toPlainString();
  }

  private PersonalRecordResponse toResponse(PersonalRecord r, String exerciseName) {
    return new PersonalRecordResponse(r.getId(), r.getExerciseId(), exerciseName, r.getWeight(), r.getReps(), r.getAchievedAt(), r.getSessionId());
  }
}
