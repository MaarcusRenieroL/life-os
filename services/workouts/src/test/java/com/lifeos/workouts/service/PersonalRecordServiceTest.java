package com.lifeos.workouts.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.workouts.domains.entity.Exercise;
import com.lifeos.workouts.domains.entity.PersonalRecord;
import com.lifeos.workouts.domains.entity.SessionSet;
import com.lifeos.workouts.domains.entity.WorkoutSession;
import com.lifeos.workouts.repository.ExerciseRepository;
import com.lifeos.workouts.repository.PersonalRecordRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PersonalRecordServiceTest {

  @Mock private PersonalRecordRepository recordRepository;
  @Mock private ExerciseRepository exerciseRepository;
  @Mock private NotificationEventPublisher notificationEventPublisher;
  @InjectMocks private PersonalRecordService service;

  private final UUID userId = UUID.randomUUID();
  private final Exercise bench = Exercise.builder().id(UUID.randomUUID()).name("Barbell Bench Press").build();
  private final WorkoutSession session = WorkoutSession.builder().id(UUID.randomUUID()).userId(userId).build();

  private SessionSet set(String weight, Integer reps, boolean completed) {
    return SessionSet.builder()
        .id(UUID.randomUUID())
        .exerciseId(bench.getId())
        .actualWeight(weight == null ? null : new BigDecimal(weight))
        .actualReps(reps)
        .completed(completed)
        .build();
  }

  private PersonalRecord record(String weight, UUID sessionId) {
    return PersonalRecord.builder().exerciseId(bench.getId()).weight(new BigDecimal(weight)).reps(5).sessionId(sessionId).build();
  }

  private void existing(PersonalRecord... records) {
    when(recordRepository.findAllByUserIdAndExerciseId(userId, bench.getId())).thenReturn(List.of(records));
  }

  @Test
  void firstEverWeightIsRecordedAsABaselineWithoutANotification() {
    existing();
    SessionSet set = set("60", 8, true);

    assertThat(service.recompute(userId, session, bench, List.of(set))).contains(set.getId());

    verify(recordRepository).save(any(PersonalRecord.class));
    verify(notificationEventPublisher, never()).publish(any(), any(), any(), any(), any());
  }

  @Test
  void beatingAPreviousSessionsBestRecordsItAndNotifies() {
    existing(record("80", UUID.randomUUID()));
    SessionSet set = set("82.5", 3, true);

    assertThat(service.recompute(userId, session, bench, List.of(set))).contains(set.getId());

    verify(notificationEventPublisher)
        .publish(eq(userId), eq(NotificationEventType.WORKOUT_PERSONAL_RECORD), eq("New PR: Barbell Bench Press"), eq("82.5 kg × 3 (previous best 80 kg)"), any(Map.class));
  }

  @Test
  void aSessionThatRampsUpEarnsOneRecordForItsHeaviestSetNotOnePerSet() {
    existing(record("70", UUID.randomUUID()));
    SessionSet light = set("80", 8, true);
    SessionSet mid = set("85", 8, true);
    SessionSet heavy = set("90", 5, true);

    assertThat(service.recompute(userId, session, bench, List.of(light, mid, heavy))).contains(heavy.getId());

    ArgumentCaptor<PersonalRecord> saved = ArgumentCaptor.forClass(PersonalRecord.class);
    verify(recordRepository).save(saved.capture());
    assertThat(saved.getValue().getWeight()).isEqualByComparingTo("90");
  }

  @Test
  void matchingOrLiftingLessThanAPreviousBestIsNotARecordEvenForMoreReps() {
    existing(record("80", UUID.randomUUID()));

    assertThat(service.recompute(userId, session, bench, List.of(set("80", 12, true)))).isEmpty();
    assertThat(service.recompute(userId, session, bench, List.of(set("70", 20, true)))).isEmpty();

    verify(recordRepository, never()).save(any());
  }

  @Test
  void onlyACompletedSetWithARealWeightAndRepsCanBeARecord() {
    existing();

    assertThat(service.recompute(userId, session, bench, List.of(set("100", 5, false)))).isEmpty();
    assertThat(service.recompute(userId, session, bench, List.of(set(null, 5, true)))).isEmpty();
    assertThat(service.recompute(userId, session, bench, List.of(set("0", 5, true)))).isEmpty();
    assertThat(service.recompute(userId, session, bench, List.of(set("100", 0, true)))).isEmpty();
    assertThat(service.recompute(userId, session, bench, List.of(set("100", null, true)))).isEmpty();

    verify(recordRepository, never()).save(any());
  }

  @Test
  void anExistingRecordFromThisSessionIsReplacedNotDuplicatedAndDoesNotReNotifyForTheSameWeight() {
    existing(record("80", UUID.randomUUID()), record("90", session.getId()));
    SessionSet set = set("90", 6, true);

    assertThat(service.recompute(userId, session, bench, List.of(set))).contains(set.getId());

    verify(recordRepository).deleteAllBySessionIdAndExerciseId(session.getId(), bench.getId());
    verify(recordRepository).save(any(PersonalRecord.class));
    verify(notificationEventPublisher, never()).publish(any(), any(), any(), any(), any());
  }

  @Test
  void pushingTheWeightUpAgainMidSessionNotifiesAgainOnlyBecauseItImproved() {
    existing(record("80", UUID.randomUUID()), record("85", session.getId()));

    service.recompute(userId, session, bench, List.of(set("90", 5, true)));

    verify(notificationEventPublisher).publish(eq(userId), eq(NotificationEventType.WORKOUT_PERSONAL_RECORD), any(), any(), any(Map.class));
  }

  @Test
  void unTickingTheRecordSetTakesTheRecordBackAndFallsBackToTheNextHeaviestQualifyingSet() {
    existing(record("70", UUID.randomUUID()), record("90", session.getId()));
    SessionSet unticked = set("90", 5, false);
    SessionSet next = set("85", 8, true);

    assertThat(service.recompute(userId, session, bench, List.of(unticked, next))).contains(next.getId());

    verify(recordRepository).deleteAllBySessionIdAndExerciseId(session.getId(), bench.getId());
  }

  @Test
  void noQualifyingSetLeftMeansNoRecordAtAll() {
    existing(record("90", session.getId()));

    assertThat(service.recompute(userId, session, bench, List.of(set("90", 5, false)))).isEmpty();

    verify(recordRepository).deleteAllBySessionIdAndExerciseId(session.getId(), bench.getId());
    verify(recordRepository, never()).save(any());
  }

  @Test
  void previousBestsIgnoreRecordsFromTheSessionBeingViewed() {
    UUID other = UUID.randomUUID();
    PersonalRecord older = PersonalRecord.builder().exerciseId(bench.getId()).weight(new BigDecimal("80")).sessionId(other).build();
    PersonalRecord thisSession = PersonalRecord.builder().exerciseId(bench.getId()).weight(new BigDecimal("90")).sessionId(session.getId()).build();
    when(recordRepository.findAllByUserIdOrderByAchievedAtDesc(userId)).thenReturn(List.of(thisSession, older));

    assertThat(service.previousBests(userId, session.getId())).containsEntry(bench.getId(), new BigDecimal("80"));
  }
}
