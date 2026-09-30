package com.lifeos.workouts.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.workouts.domains.dto.request.AddSetRequest;
import com.lifeos.workouts.domains.dto.request.CompleteSessionRequest;
import com.lifeos.workouts.domains.dto.request.ScheduleSessionRequest;
import com.lifeos.workouts.domains.dto.request.StartSessionRequest;
import com.lifeos.workouts.domains.dto.request.UpdateSetRequest;
import com.lifeos.workouts.domains.dto.response.SessionDetailResponse;
import com.lifeos.workouts.domains.entity.Exercise;
import com.lifeos.workouts.domains.entity.Routine;
import com.lifeos.workouts.domains.entity.RoutineExercise;
import com.lifeos.workouts.domains.entity.SessionSet;
import com.lifeos.workouts.domains.entity.WorkoutSession;
import com.lifeos.workouts.domains.enums.ExerciseCategory;
import com.lifeos.workouts.domains.enums.SessionStatus;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.exception.ResourceNotFoundException;
import com.lifeos.workouts.integration.WorkoutCalendarSyncService;
import com.lifeos.workouts.repository.ExerciseRepository;
import com.lifeos.workouts.repository.SessionSetRepository;
import com.lifeos.workouts.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SessionServiceTest {

  @Mock private WorkoutSessionRepository sessionRepository;
  @Mock private SessionSetRepository setRepository;
  @Mock private ExerciseRepository exerciseRepository;
  @Mock private RoutineService routineService;
  @Mock private ExerciseService exerciseService;
  @Mock private PersonalRecordService personalRecordService;
  @Mock private WorkoutCalendarSyncService calendarSync;

  private SessionService service;

  private final UUID userId = UUID.randomUUID();
  private final Exercise bench = Exercise.builder().id(UUID.randomUUID()).name("Bench").category(ExerciseCategory.CHEST).build();
  private final Exercise squat = Exercise.builder().id(UUID.randomUUID()).name("Squat").category(ExerciseCategory.LEGS).build();

  /** In-memory stand-in for the set table, so tests can read back what the service persisted. */
  private final List<SessionSet> storedSets = new ArrayList<>();

  @BeforeEach
  void setUp() {
    service = new SessionService(sessionRepository, setRepository, exerciseRepository, routineService, exerciseService, personalRecordService, calendarSync);

    when(sessionRepository.save(any())).thenAnswer(
        inv -> {
          WorkoutSession s = inv.getArgument(0);
          if (s.getId() == null) s.setId(UUID.randomUUID());
          return s;
        });
    when(setRepository.save(any())).thenAnswer(
        inv -> {
          SessionSet s = inv.getArgument(0);
          if (s.getId() == null) s.setId(UUID.randomUUID());
          if (!storedSets.contains(s)) storedSets.add(s);
          return s;
        });
    when(setRepository.saveAll(anyCollection())).thenAnswer(
        inv -> {
          for (SessionSet s : (Iterable<SessionSet>) inv.getArgument(0)) {
            s.setId(UUID.randomUUID());
            storedSets.add(s);
          }
          return inv.getArgument(0);
        });
    when(setRepository.findAllBySessionIdOrderByExercisePositionAscSetNumberAsc(any()))
        .thenAnswer(inv -> storedSets.stream().sorted(java.util.Comparator.comparing(SessionSet::getExercisePosition).thenComparing(SessionSet::getSetNumber)).toList());
    when(setRepository.findByIdAndSessionId(any(), any()))
        .thenAnswer(inv -> storedSets.stream().filter(s -> s.getId().equals(inv.getArgument(0))).findFirst());
    org.mockito.Mockito.doAnswer(inv -> storedSets.remove(inv.<SessionSet>getArgument(0))).when(setRepository).delete(any(SessionSet.class));
    when(exerciseRepository.findAllByIdIn(anyCollection())).thenReturn(List.of(bench, squat));
    when(exerciseRepository.findById(bench.getId())).thenReturn(Optional.of(bench));
    when(exerciseRepository.findById(squat.getId())).thenReturn(Optional.of(squat));
    when(exerciseService.requireVisible(eq(userId), eq(bench.getId()))).thenReturn(bench);
    when(exerciseService.requireVisible(eq(userId), eq(squat.getId()))).thenReturn(squat);
    when(personalRecordService.previousBests(any(), any())).thenReturn(Map.of());
    when(sessionRepository.findFirstByUserIdAndStatus(userId, SessionStatus.IN_PROGRESS)).thenReturn(Optional.empty());
  }

  private WorkoutSession inProgress() {
    WorkoutSession s = WorkoutSession.builder().id(UUID.randomUUID()).userId(userId).name("Push").status(SessionStatus.IN_PROGRESS).startedAt(Instant.now().minusSeconds(1800)).build();
    when(sessionRepository.findByIdAndUserId(s.getId(), userId)).thenReturn(Optional.of(s));
    return s;
  }

  private SessionSet storedSet(WorkoutSession s, Exercise e, int position, int number, boolean completed) {
    SessionSet set = SessionSet.builder().id(UUID.randomUUID()).sessionId(s.getId()).exerciseId(e.getId()).exercisePosition(position).setNumber(number).completed(completed).isPr(false).build();
    storedSets.add(set);
    return set;
  }

  // ---- starting ----

  @Test
  void startingFromARoutinePrefillsOneSetPerTargetSet() {
    Routine routine = Routine.builder().id(UUID.randomUUID()).userId(userId).name("Push Day").build();
    when(routineService.findOwned(userId, routine.getId())).thenReturn(routine);
    when(routineService.exercisesOf(routine.getId()))
        .thenReturn(List.of(
            RoutineExercise.builder().exerciseId(bench.getId()).position(1).targetSets(3).targetReps(8).targetWeight(new BigDecimal("60")).restSeconds(120).build(),
            RoutineExercise.builder().exerciseId(squat.getId()).position(2).targetSets(2).targetReps(5).restSeconds(150).build()));

    SessionDetailResponse response = service.start(userId, new StartSessionRequest(routine.getId(), null, null));

    assertThat(response.session().name()).isEqualTo("Push Day");
    assertThat(response.session().status()).isEqualTo(SessionStatus.IN_PROGRESS);
    assertThat(response.session().startedAt()).isNotNull();
    assertThat(response.exercises()).hasSize(2);
    assertThat(response.exercises().get(0).sets()).hasSize(3);
    assertThat(response.exercises().get(0).sets().get(0).targetWeight()).isEqualByComparingTo("60");
    assertThat(response.exercises().get(1).sets()).hasSize(2);
    assertThat(response.session().completedSets()).isZero();
  }

  @Test
  void aBlankSessionStartsEmptyAndDefaultsItsName() {
    SessionDetailResponse response = service.start(userId, new StartSessionRequest(null, "  ", null));

    assertThat(response.session().name()).isEqualTo("Workout");
    assertThat(response.exercises()).isEmpty();
  }

  @Test
  void onlyOneWorkoutCanBeInProgress() {
    when(sessionRepository.findFirstByUserIdAndStatus(userId, SessionStatus.IN_PROGRESS)).thenReturn(Optional.of(WorkoutSession.builder().build()));

    assertThatThrownBy(() -> service.start(userId, new StartSessionRequest(null, null, null))).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> service.startPlanned(userId, UUID.randomUUID())).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void schedulingCreatesAPlannedSessionLinkedToACalendarEvent() {
    UUID eventId = UUID.randomUUID();
    Instant when = Instant.parse("2026-10-05T17:00:00Z");
    when(calendarSync.createEvent(eq(userId), eq("Legs"), eq(when), eq(when.plusSeconds(3600)), any())).thenReturn(eventId);

    SessionDetailResponse response = service.schedule(userId, new ScheduleSessionRequest(null, "Legs", when, null));

    assertThat(response.session().status()).isEqualTo(SessionStatus.PLANNED);
    assertThat(response.session().calendarEventId()).isEqualTo(eventId);
    assertThat(response.session().scheduledFor()).isEqualTo(when);
  }

  @Test
  void startingAPlannedWorkoutKeepsItsCalendarEventAndStampsStartTime() {
    UUID eventId = UUID.randomUUID();
    WorkoutSession planned = WorkoutSession.builder().id(UUID.randomUUID()).userId(userId).name("Legs").status(SessionStatus.PLANNED).calendarEventId(eventId).build();
    when(sessionRepository.findByIdAndUserId(planned.getId(), userId)).thenReturn(Optional.of(planned));

    SessionDetailResponse response = service.startPlanned(userId, planned.getId());

    assertThat(response.session().status()).isEqualTo(SessionStatus.IN_PROGRESS);
    assertThat(response.session().startedAt()).isNotNull();
    assertThat(response.session().calendarEventId()).isEqualTo(eventId);
    verify(calendarSync, never()).deleteEvent(any(), any());
  }

  @Test
  void onlyAPlannedSessionCanBeStartedThatWay() {
    WorkoutSession running = inProgress();

    assertThatThrownBy(() -> service.startPlanned(userId, running.getId())).isInstanceOf(InvalidRequestException.class);
  }

  // ---- sets ----

  @Test
  void addingASetOfANewExerciseAppendsItAndAnotherSetCarriesTheLastNumbers() {
    WorkoutSession s = inProgress();
    SessionSet first = storedSet(s, bench, 1, 1, true);
    first.setActualWeight(new BigDecimal("62.5"));
    first.setActualReps(8);
    first.setRestSeconds(90);

    service.addSet(userId, s.getId(), new AddSetRequest(squat.getId()));
    SessionDetailResponse response = service.addSet(userId, s.getId(), new AddSetRequest(bench.getId()));

    SessionSet squatSet = storedSets.stream().filter(x -> x.getExerciseId().equals(squat.getId())).findFirst().orElseThrow();
    assertThat(squatSet.getExercisePosition()).isEqualTo(2);
    assertThat(squatSet.getSetNumber()).isEqualTo(1);

    SessionSet secondBench = storedSets.stream().filter(x -> x.getExerciseId().equals(bench.getId()) && x.getSetNumber() == 2).findFirst().orElseThrow();
    assertThat(secondBench.getExercisePosition()).isEqualTo(1);
    assertThat(secondBench.getTargetWeight()).isEqualByComparingTo("62.5");
    assertThat(secondBench.getTargetReps()).isEqualTo(8);
    assertThat(response.exercises()).hasSize(2);
  }

  @Test
  void setsCanOnlyBeChangedWhileInProgress() {
    WorkoutSession planned = WorkoutSession.builder().id(UUID.randomUUID()).userId(userId).status(SessionStatus.PLANNED).build();
    when(sessionRepository.findByIdAndUserId(planned.getId(), userId)).thenReturn(Optional.of(planned));

    assertThatThrownBy(() -> service.addSet(userId, planned.getId(), new AddSetRequest(bench.getId()))).isInstanceOf(InvalidRequestException.class);
    assertThatThrownBy(() -> service.updateSet(userId, planned.getId(), UUID.randomUUID(), new UpdateSetRequest(5, BigDecimal.TEN, null, true))).isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void tickingASetStampsItAndFlagsTheSetThePersonalRecordServiceSaysHoldsTheRecord() {
    WorkoutSession s = inProgress();
    SessionSet set = storedSet(s, bench, 1, 1, false);
    when(personalRecordService.recompute(eq(userId), eq(s), eq(bench), any())).thenReturn(Optional.of(set.getId()));

    SessionDetailResponse response = service.updateSet(userId, s.getId(), set.getId(), new UpdateSetRequest(5, new BigDecimal("100"), 120, true));

    assertThat(set.getCompleted()).isTrue();
    assertThat(set.getCompletedAt()).isNotNull();
    assertThat(set.getIsPr()).isTrue();
    assertThat(response.session().prCount()).isEqualTo(1);
    assertThat(response.session().volume()).isEqualByComparingTo("500");
  }

  @Test
  void theRecordFlagMovesToTheHeavierSetAndOffTheLighterOne() {
    WorkoutSession s = inProgress();
    SessionSet light = storedSet(s, bench, 1, 1, true);
    light.setIsPr(true);
    light.setActualWeight(new BigDecimal("80"));
    light.setActualReps(8);
    SessionSet heavy = storedSet(s, bench, 1, 2, false);
    when(personalRecordService.recompute(eq(userId), eq(s), eq(bench), any())).thenReturn(Optional.of(heavy.getId()));

    SessionDetailResponse response = service.updateSet(userId, s.getId(), heavy.getId(), new UpdateSetRequest(5, new BigDecimal("90"), null, true));

    assertThat(light.getIsPr()).isFalse();
    assertThat(heavy.getIsPr()).isTrue();
    assertThat(response.session().prCount()).isEqualTo(1);
  }

  @Test
  void untickingTheRecordSetClearsItsFlagWhenNothingElseQualifies() {
    WorkoutSession s = inProgress();
    SessionSet set = storedSet(s, bench, 1, 1, true);
    set.setIsPr(true);
    set.setActualWeight(new BigDecimal("100"));
    set.setActualReps(5);
    when(personalRecordService.recompute(eq(userId), eq(s), eq(bench), any())).thenReturn(Optional.empty());

    service.updateSet(userId, s.getId(), set.getId(), new UpdateSetRequest(5, new BigDecimal("100"), null, false));

    assertThat(set.getIsPr()).isFalse();
    assertThat(set.getCompletedAt()).isNull();
  }

  @Test
  void onlyTheEditedExercisesRecordsAreRecomputed() {
    WorkoutSession s = inProgress();
    SessionSet benchSet = storedSet(s, bench, 1, 1, false);
    storedSet(s, squat, 2, 1, true);

    service.updateSet(userId, s.getId(), benchSet.getId(), new UpdateSetRequest(5, new BigDecimal("60"), null, true));

    verify(personalRecordService).recompute(eq(userId), eq(s), eq(bench), any());
    verify(personalRecordService, never()).recompute(any(), any(), eq(squat), any());
  }

  @Test
  void deletingASetRenumbersTheRestOfThatExercise() {
    WorkoutSession s = inProgress();
    SessionSet one = storedSet(s, bench, 1, 1, false);
    SessionSet two = storedSet(s, bench, 1, 2, false);
    SessionSet three = storedSet(s, bench, 1, 3, false);
    SessionSet otherExercise = storedSet(s, squat, 2, 1, false);

    SessionDetailResponse response = service.deleteSet(userId, s.getId(), one.getId());

    assertThat(storedSets).doesNotContain(one);
    assertThat(two.getSetNumber()).isEqualTo(1);
    assertThat(three.getSetNumber()).isEqualTo(2);
    assertThat(otherExercise.getSetNumber()).isEqualTo(1);
    assertThat(response.exercises().get(0).sets()).extracting(x -> x.setNumber()).containsExactly(1, 2);
  }

  @Test
  void deletingASetRecomputesTheExercisesRecord() {
    WorkoutSession s = inProgress();
    SessionSet pr = storedSet(s, bench, 1, 1, true);
    pr.setIsPr(true);
    pr.setActualWeight(new BigDecimal("110"));
    SessionSet other = storedSet(s, bench, 1, 2, true);
    other.setActualWeight(new BigDecimal("100"));
    other.setActualReps(5);
    when(personalRecordService.recompute(eq(userId), eq(s), eq(bench), any())).thenReturn(Optional.of(other.getId()));

    service.deleteSet(userId, s.getId(), pr.getId());

    assertThat(other.getIsPr()).isTrue();
  }

  // ---- completing / deleting ----

  @Test
  void completingDropsUntickedSetsFixesDurationAndCreatesACalendarEvent() {
    WorkoutSession s = inProgress();
    SessionSet done = storedSet(s, bench, 1, 1, true);
    done.setActualWeight(new BigDecimal("60"));
    done.setActualReps(10);
    SessionSet skipped = storedSet(s, bench, 1, 2, false);
    UUID eventId = UUID.randomUUID();
    when(calendarSync.createEvent(eq(userId), eq("Push"), any(), any(), any())).thenReturn(eventId);

    SessionDetailResponse response = service.complete(userId, s.getId(), new CompleteSessionRequest("  felt strong "));

    assertThat(response.session().status()).isEqualTo(SessionStatus.COMPLETED);
    assertThat(response.session().durationSeconds()).isBetween(1790, 1900);
    assertThat(response.session().notes()).isEqualTo("felt strong");
    assertThat(response.session().calendarEventId()).isEqualTo(eventId);
    verify(setRepository).deleteAll(List.of(skipped));
  }

  @Test
  void completingAScheduledWorkoutMovesItsExistingEventInsteadOfCreatingAnother() {
    WorkoutSession s = inProgress();
    UUID eventId = UUID.randomUUID();
    s.setCalendarEventId(eventId);
    storedSet(s, bench, 1, 1, true);

    service.complete(userId, s.getId(), null);

    verify(calendarSync).updateEvent(eq(userId), eq(eventId), eq("Push"), eq(s.getStartedAt()), any(), any());
    verify(calendarSync, never()).createEvent(any(), any(), any(), any(), any());
  }

  @Test
  void aWorkoutWithNothingLoggedCannotBeCompleted() {
    WorkoutSession s = inProgress();
    storedSet(s, bench, 1, 1, false);

    assertThatThrownBy(() -> service.complete(userId, s.getId(), null)).isInstanceOf(InvalidRequestException.class).hasMessageContaining("at least one set");
    assertThat(s.getStatus()).isEqualTo(SessionStatus.IN_PROGRESS);
  }

  @Test
  void deletingASessionTakesItsRecordsAndCalendarEventWithIt() {
    WorkoutSession s = inProgress();
    UUID eventId = UUID.randomUUID();
    s.setCalendarEventId(eventId);

    service.delete(userId, s.getId());

    verify(personalRecordService).deleteForSession(s.getId());
    verify(calendarSync).deleteEvent(userId, eventId);
    verify(sessionRepository).delete(s);
  }

  @Test
  void anotherUsersSessionIsNotFound() {
    UUID id = UUID.randomUUID();
    when(sessionRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(userId, id)).isInstanceOf(ResourceNotFoundException.class);
    assertThatThrownBy(() -> service.delete(userId, id)).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void goalStatsCountOnlyCompletedGoalLinkedSessionsAndSplitTheRecentWindow() {
    UUID goalId = UUID.randomUUID();
    WorkoutSession recent = WorkoutSession.builder().goalId(goalId).completedAt(Instant.now().minusSeconds(86400)).build();
    WorkoutSession old = WorkoutSession.builder().goalId(goalId).completedAt(Instant.now().minusSeconds(86400L * 60)).build();
    WorkoutSession unlinked = WorkoutSession.builder().completedAt(Instant.now()).build();
    when(sessionRepository.findAllByUserIdAndStatus(userId, SessionStatus.COMPLETED)).thenReturn(List.of(recent, old, unlinked));

    var stats = service.goalStats(userId);

    assertThat(stats).containsOnlyKeys(goalId);
    assertThat(stats.get(goalId).sessionsLast28Days()).isEqualTo(1);
    assertThat(stats.get(goalId).totalSessions()).isEqualTo(2);
  }
}
