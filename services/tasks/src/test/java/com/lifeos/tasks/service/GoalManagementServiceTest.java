package com.lifeos.tasks.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.tasks.domains.dto.request.SaveGoalRequest;
import com.lifeos.tasks.domains.dto.request.UpdateGoalStatusRequest;
import com.lifeos.tasks.domains.dto.response.GoalSummaryResponse;
import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.domains.entity.GoalLink;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.enums.GoalLinkType;
import com.lifeos.tasks.domains.enums.GoalReviewFrequency;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.domains.enums.LifeArea;
import com.lifeos.tasks.exception.InvalidRequestException;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.GoalLinkRepository;
import com.lifeos.tasks.repository.GoalRepository;
import com.lifeos.tasks.repository.TaskRepository;
import java.time.LocalDate;
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
class GoalManagementServiceTest {

  @Mock private GoalRepository goalRepository;
  @Mock private GoalLinkRepository goalLinkRepository;
  @Mock private TaskRepository taskRepository;
  @Mock private GoalProgressAssembler progressAssembler;
  @Mock private GoalStatusSyncer statusSyncer;
  @Mock private GoalItemsService itemsService;

  private GoalManagementService service;

  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service =
        new GoalManagementService(
            goalRepository, goalLinkRepository, taskRepository, progressAssembler, statusSyncer, itemsService);
    when(goalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(goalLinkRepository.findAllByUserId(userId)).thenReturn(List.of());
    // Progress for whatever goals a test hands in: nothing linked, status passes through.
    when(progressAssembler.assemble(eq(userId), anyCollection()))
        .thenAnswer(
            inv -> {
              var goals = (java.util.Collection<Goal>) inv.getArgument(1);
              var map = new java.util.HashMap<UUID, GoalProgressAssembler.GoalProgress>();
              goals.forEach(g -> map.put(g.getId(), progressFor(g)));
              return map;
            });
    when(statusSyncer.sync(eq(userId), any())).thenAnswer(inv -> progressFor(inv.getArgument(1)));
  }

  private GoalProgressAssembler.GoalProgress progressFor(Goal goal) {
    var result = new GoalProgressCalculator.Result(0, null, null, null, null, null, null);
    return new GoalProgressAssembler.GoalProgress(result, goal.getStatus(), 0, 0, 0, 0, 0, 0, 0);
  }

  private Goal goal(String name, GoalStatus status, LifeArea area, int priority) {
    return Goal.builder().id(UUID.randomUUID()).userId(userId).name(name).status(status).area(area).priority(priority).build();
  }

  private SaveGoalRequest request(String name, LocalDate start, LocalDate target, GoalReviewFrequency frequency) {
    return new SaveGoalRequest(name, "  desc  ", LifeArea.HEALTH, 2, start, target, frequency, null);
  }

  @Test
  void createTrimsFieldsAndSchedulesTheFirstReviewFromToday() {
    GoalSummaryResponse response = service.create(userId, request("  Run a 10k ", null, null, GoalReviewFrequency.BIWEEKLY));

    assertThat(response.name()).isEqualTo("Run a 10k");
    assertThat(response.description()).isEqualTo("desc");
    assertThat(response.priority()).isEqualTo(2);
    assertThat(response.nextReviewDate()).isEqualTo(LocalDate.now().plusWeeks(2));
  }

  @Test
  void theWeeklyWorkoutTargetIsSavedAndSurfacedOnTheSummary() {
    var request = new SaveGoalRequest("Get fit", null, LifeArea.HEALTH, 2, null, null, null, 4);

    GoalSummaryResponse created = service.create(userId, request);

    assertThat(created.progress().weeklyWorkoutTarget()).isEqualTo(4);
    assertThat(service.create(userId, this.request("No target", null, null, null)).progress().weeklyWorkoutTarget()).isNull();
  }

  @Test
  void createWithoutCadenceHasNoReviewDate() {
    assertThat(service.create(userId, request("A", null, null, null)).nextReviewDate()).isNull();
  }

  @Test
  void createRejectsTargetBeforeStart() {
    assertThatThrownBy(
            () -> service.create(userId, request("A", LocalDate.of(2026, 5, 1), LocalDate.of(2026, 4, 1), null)))
        .isInstanceOf(InvalidRequestException.class);
  }

  @Test
  void updateOnlyReachesTheCallersOwnGoal() {
    UUID id = UUID.randomUUID();
    when(goalRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.update(userId, id, request("A", null, null, null)))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void updateKeepsADueReviewDueWhenTheCadenceIsUnchanged() {
    Goal existing = goal("A", GoalStatus.ACTIVE, LifeArea.CAREER, 3);
    existing.setReviewFrequency(GoalReviewFrequency.MONTHLY);
    LocalDate due = LocalDate.now().minusDays(3);
    existing.setNextReviewDate(due);
    when(goalRepository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

    GoalSummaryResponse response =
        service.update(userId, existing.getId(), request("A2", null, null, GoalReviewFrequency.MONTHLY));

    assertThat(response.nextReviewDate()).isEqualTo(due);
    assertThat(response.reviewDue()).isTrue();
  }

  @Test
  void updateRebasesTheReviewWhenTheCadenceChanges() {
    Goal existing = goal("A", GoalStatus.ACTIVE, LifeArea.CAREER, 3);
    existing.setReviewFrequency(GoalReviewFrequency.MONTHLY);
    existing.setNextReviewDate(LocalDate.now().minusDays(3));
    when(goalRepository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

    GoalSummaryResponse response =
        service.update(userId, existing.getId(), request("A", null, null, GoalReviewFrequency.BIWEEKLY));

    assertThat(response.nextReviewDate()).isEqualTo(LocalDate.now().plusWeeks(2));
  }

  @Test
  void clearingTheCadenceClearsTheReviewDate() {
    Goal existing = goal("A", GoalStatus.ACTIVE, LifeArea.CAREER, 3);
    existing.setReviewFrequency(GoalReviewFrequency.MONTHLY);
    existing.setNextReviewDate(LocalDate.now().plusDays(5));
    when(goalRepository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

    assertThat(service.update(userId, existing.getId(), request("A", null, null, null)).nextReviewDate()).isNull();
  }

  @Test
  void derivedStatesCannotBeSetByHand() {
    for (GoalStatus derived : List.of(GoalStatus.ON_TRACK, GoalStatus.AT_RISK)) {
      assertThatThrownBy(() -> service.setStatus(userId, UUID.randomUUID(), new UpdateGoalStatusRequest(derived)))
          .isInstanceOf(InvalidRequestException.class);
    }
  }

  @Test
  void completingStampsCompletedAtAndReactivatingClearsIt() {
    Goal existing = goal("A", GoalStatus.ACTIVE, LifeArea.CAREER, 3);
    when(goalRepository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

    GoalSummaryResponse done = service.setStatus(userId, existing.getId(), new UpdateGoalStatusRequest(GoalStatus.COMPLETED));
    assertThat(done.status()).isEqualTo(GoalStatus.COMPLETED);
    assertThat(done.completedAt()).isNotNull();

    GoalSummaryResponse reopened = service.setStatus(userId, existing.getId(), new UpdateGoalStatusRequest(GoalStatus.ACTIVE));
    assertThat(reopened.completedAt()).isNull();
  }

  @Test
  void listHidesArchivedByDefaultAndSortsByPriorityThenTargetDate() {
    Goal p1 = goal("Zeta", GoalStatus.ACTIVE, LifeArea.CAREER, 1);
    Goal p3Soon = goal("Alpha", GoalStatus.ACTIVE, LifeArea.CAREER, 3);
    p3Soon.setTargetDate(LocalDate.of(2026, 7, 1));
    Goal p3Later = goal("Beta", GoalStatus.ACTIVE, LifeArea.CAREER, 3);
    p3Later.setTargetDate(LocalDate.of(2026, 9, 1));
    Goal archived = goal("Old", GoalStatus.ARCHIVED, LifeArea.CAREER, 1);
    when(goalRepository.findAllByUserIdOrderByNameAsc(userId)).thenReturn(List.of(p3Later, archived, p3Soon, p1));

    var names = service.list(userId, null, null, null, null, false).stream().map(GoalSummaryResponse::name).toList();

    assertThat(names).containsExactly("Zeta", "Alpha", "Beta");
    assertThat(service.list(userId, null, GoalStatus.ARCHIVED, null, null, false)).extracting(GoalSummaryResponse::name).containsExactly("Old");
    assertThat(service.list(userId, null, null, null, null, true)).hasSize(4);
  }

  @Test
  void listFiltersByAreaPriorityAndSearchText() {
    Goal career = goal("Ship the app", GoalStatus.ACTIVE, LifeArea.CAREER, 2);
    Goal health = goal("Run a 10k", GoalStatus.ACTIVE, LifeArea.HEALTH, 2);
    health.setDescription("Get fit for autumn");
    when(goalRepository.findAllByUserIdOrderByNameAsc(userId)).thenReturn(List.of(career, health));

    assertThat(service.list(userId, LifeArea.HEALTH, null, null, null, false)).extracting(GoalSummaryResponse::name).containsExactly("Run a 10k");
    assertThat(service.list(userId, null, null, 1, null, false)).isEmpty();
    assertThat(service.list(userId, null, null, null, "AUTUMN", false)).extracting(GoalSummaryResponse::name).containsExactly("Run a 10k");
  }

  @Test
  void aGoalIsBlockedUntilItsBlockerIsFinished() {
    Goal blocker = goal("Save deposit", GoalStatus.ACTIVE, LifeArea.FINANCE, 1);
    Goal blocked = goal("Buy flat", GoalStatus.ACTIVE, LifeArea.FINANCE, 1);
    GoalLink link = GoalLink.builder().sourceGoalId(blocker.getId()).targetGoalId(blocked.getId()).linkType(GoalLinkType.BLOCKS).build();
    when(goalLinkRepository.findAllByUserId(userId)).thenReturn(List.of(link));
    when(goalRepository.findAllByUserIdOrderByNameAsc(userId)).thenReturn(List.of(blocker, blocked));

    Map<String, Boolean> blockedByName =
        service.list(userId, null, null, null, null, false).stream()
            .collect(java.util.stream.Collectors.toMap(GoalSummaryResponse::name, GoalSummaryResponse::blocked));
    assertThat(blockedByName).containsEntry("Buy flat", true).containsEntry("Save deposit", false);

    blocker.setStatus(GoalStatus.COMPLETED);
    assertThat(
            service.list(userId, null, null, null, null, false).stream()
                .filter(g -> g.name().equals("Buy flat"))
                .findFirst()
                .orElseThrow()
                .blocked())
        .isFalse();
  }

  @Test
  void linkTaskSetsTheTasksGoalAndUnlinkOnlyClearsThisGoal() {
    Goal g = goal("A", GoalStatus.ACTIVE, LifeArea.CAREER, 3);
    Task task = Task.builder().id(UUID.randomUUID()).userId(userId).title("T").build();
    when(goalRepository.findByIdAndUserId(g.getId(), userId)).thenReturn(Optional.of(g));
    when(taskRepository.findByIdAndUserId(task.getId(), userId)).thenReturn(Optional.of(task));

    service.linkTask(userId, g.getId(), task.getId());
    assertThat(task.getGoalId()).isEqualTo(g.getId());

    service.unlinkTask(userId, g.getId(), task.getId());
    assertThat(task.getGoalId()).isNull();

    // A task linked to a different goal is left alone when this goal's "unlink" is hit.
    UUID otherGoal = UUID.randomUUID();
    task.setGoalId(otherGoal);
    service.unlinkTask(userId, g.getId(), task.getId());
    assertThat(task.getGoalId()).isEqualTo(otherGoal);
    verify(taskRepository, org.mockito.Mockito.times(2)).save(task);
  }

  @Test
  void deleteChecksOwnership() {
    UUID id = UUID.randomUUID();
    when(goalRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.delete(userId, id)).isInstanceOf(ResourceNotFoundException.class);
  }
}
