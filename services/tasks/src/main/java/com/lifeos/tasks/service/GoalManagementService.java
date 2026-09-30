package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.dto.request.SaveGoalRequest;
import com.lifeos.tasks.domains.dto.request.UpdateGoalStatusRequest;
import com.lifeos.tasks.domains.dto.response.GoalDetailResponse;
import com.lifeos.tasks.domains.dto.response.GoalLinkedTaskResponse;
import com.lifeos.tasks.domains.dto.response.GoalProgressBreakdownResponse;
import com.lifeos.tasks.domains.dto.response.GoalSummaryResponse;
import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.domains.entity.GoalLink;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.enums.GoalLinkType;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.domains.enums.LifeArea;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.exception.InvalidRequestException;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.GoalLinkRepository;
import com.lifeos.tasks.repository.GoalRepository;
import com.lifeos.tasks.repository.TaskRepository;
import com.lifeos.tasks.service.GoalProgressAssembler.GoalProgress;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The Goals module's core: goal CRUD, the derived progress/status every read carries, and the
 * link to tasks. Child records (milestones, metrics, links, reviews) live in GoalItemsService. */
@Service
@RequiredArgsConstructor
@Transactional
public class GoalManagementService {

  private final GoalRepository goalRepository;
  private final GoalLinkRepository goalLinkRepository;
  private final TaskRepository taskRepository;
  private final GoalProgressAssembler progressAssembler;
  private final GoalStatusSyncer statusSyncer;
  private final GoalItemsService itemsService;

  @Transactional(readOnly = true)
  public List<GoalSummaryResponse> list(
      UUID userId, LifeArea area, GoalStatus status, Integer priority, String q, boolean includeArchived) {
    List<Goal> goals = goalRepository.findAllByUserIdOrderByNameAsc(userId);
    Map<UUID, GoalProgress> progress = progressAssembler.assemble(userId, goals);
    Map<UUID, Goal> byId = goals.stream().collect(Collectors.toMap(Goal::getId, g -> g));
    List<GoalLink> links = goalLinkRepository.findAllByUserId(userId);
    String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase();

    return goals.stream()
        .filter(g -> area == null || g.getArea() == area)
        .filter(g -> priority == null || priority.equals(g.getPriority()))
        .filter(g -> status == null || progress.get(g.getId()).effectiveStatus() == status)
        // Archived goals are hidden from the default view - they only show when asked for, either
        // by filtering on ARCHIVED or by includeArchived.
        .filter(
            g ->
                includeArchived
                    || status == GoalStatus.ARCHIVED
                    || progress.get(g.getId()).effectiveStatus() != GoalStatus.ARCHIVED)
        .filter(
            g ->
                needle == null
                    || g.getName().toLowerCase().contains(needle)
                    || (g.getDescription() != null && g.getDescription().toLowerCase().contains(needle)))
        .map(g -> toSummary(g, progress.get(g.getId()), isBlocked(g.getId(), links, byId)))
        .sorted(
            Comparator.comparing(GoalSummaryResponse::priority)
                .thenComparing(GoalSummaryResponse::targetDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(GoalSummaryResponse::name))
        .toList();
  }

  @Transactional(readOnly = true)
  public GoalDetailResponse detail(UUID userId, UUID id) {
    Goal goal = findOwned(userId, id);
    List<Goal> all = goalRepository.findAllByUserIdOrderByNameAsc(userId);
    Map<UUID, GoalProgress> progress = progressAssembler.assemble(userId, all);
    Map<UUID, Goal> byId = all.stream().collect(Collectors.toMap(Goal::getId, g -> g));
    List<GoalLink> links = goalLinkRepository.findAllByUserId(userId);

    List<GoalLinkedTaskResponse> tasks =
        taskRepository.findAllByUserId(userId).stream()
            .filter(t -> id.equals(t.getGoalId()))
            .filter(t -> !(t.getRecurrencePattern() != null && t.getRecurringParentId() == null))
            .sorted(
                Comparator.comparing((Task t) -> t.getStatus() == TaskStatus.DONE)
                    .thenComparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(t -> new GoalLinkedTaskResponse(t.getId(), t.getTitle(), t.getStatus(), t.getDueDate()))
            .toList();

    return new GoalDetailResponse(
        toSummary(goal, progress.get(id), isBlocked(id, links, byId)),
        itemsService.milestones(id),
        itemsService.metrics(id),
        itemsService.linksFor(id, links, byId, progress),
        itemsService.reviews(id),
        tasks);
  }

  public GoalSummaryResponse create(UUID userId, SaveGoalRequest request) {
    validateDates(request);
    Goal goal = Goal.builder().userId(userId).name(request.name().trim()).build();
    apply(goal, request);
    goal.setNextReviewDate(
        goal.getReviewFrequency() == null ? null : goal.getReviewFrequency().nextAfter(LocalDate.now()));
    return summary(userId, goalRepository.save(goal));
  }

  public GoalSummaryResponse update(UUID userId, UUID id, SaveGoalRequest request) {
    validateDates(request);
    Goal goal = findOwned(userId, id);
    var previousFrequency = goal.getReviewFrequency();
    apply(goal, request);

    // Changing (or clearing) the cadence re-bases the next review; leaving it alone must not push
    // a review that's already due out into the future.
    if (goal.getReviewFrequency() == null) {
      goal.setNextReviewDate(null);
    } else if (goal.getReviewFrequency() != previousFrequency || goal.getNextReviewDate() == null) {
      goal.setNextReviewDate(goal.getReviewFrequency().nextAfter(LocalDate.now()));
    }
    return summary(userId, goalRepository.save(goal));
  }

  public GoalSummaryResponse setStatus(UUID userId, UUID id, UpdateGoalStatusRequest request) {
    GoalStatus status = request.status();
    if (status == GoalStatus.ON_TRACK || status == GoalStatus.AT_RISK) {
      throw new InvalidRequestException("On track / at risk are derived from progress and can't be set by hand");
    }
    Goal goal = findOwned(userId, id);
    goal.setStatus(status);
    goal.setCompletedAt(status == GoalStatus.COMPLETED ? Instant.now() : null);
    if (status == GoalStatus.ACTIVE
        && goal.getReviewFrequency() != null
        && (goal.getNextReviewDate() == null || goal.getNextReviewDate().isBefore(LocalDate.now()))) {
      goal.setNextReviewDate(goal.getReviewFrequency().nextAfter(LocalDate.now()));
    }
    return summary(userId, goalRepository.save(goal));
  }

  public void delete(UUID userId, UUID id) {
    goalRepository.delete(findOwned(userId, id));
  }

  /** Points an existing task at this goal (a task's goal is otherwise only settable from the task
   * form) - the goal-side half of the tasks<->goals link. */
  public GoalSummaryResponse linkTask(UUID userId, UUID goalId, UUID taskId) {
    Goal goal = findOwned(userId, goalId);
    Task task = ownedTask(userId, taskId);
    task.setGoalId(goalId);
    taskRepository.save(task);
    return summary(userId, goal);
  }

  public GoalSummaryResponse unlinkTask(UUID userId, UUID goalId, UUID taskId) {
    Goal goal = findOwned(userId, goalId);
    Task task = ownedTask(userId, taskId);
    if (goalId.equals(task.getGoalId())) {
      task.setGoalId(null);
      taskRepository.save(task);
    }
    return summary(userId, goal);
  }

  public Goal findOwned(UUID userId, UUID id) {
    return goalRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ResourceNotFoundException.of("Goal", id));
  }

  private GoalSummaryResponse summary(UUID userId, Goal goal) {
    GoalProgress progress = statusSyncer.sync(userId, goal);
    List<Goal> all = goalRepository.findAllByUserIdOrderByNameAsc(userId);
    Map<UUID, Goal> byId = all.stream().collect(Collectors.toMap(Goal::getId, g -> g));
    return toSummary(goal, progress, isBlocked(goal.getId(), goalLinkRepository.findAllByUserId(userId), byId));
  }

  private Task ownedTask(UUID userId, UUID taskId) {
    return taskRepository.findByIdAndUserId(taskId, userId).orElseThrow(() -> ResourceNotFoundException.of("Task", taskId));
  }

  private void apply(Goal goal, SaveGoalRequest request) {
    goal.setName(request.name().trim());
    goal.setDescription(request.description() == null || request.description().isBlank() ? null : request.description().trim());
    goal.setArea(request.area());
    goal.setPriority(request.priority() == null ? 3 : request.priority());
    goal.setStartDate(request.startDate());
    goal.setTargetDate(request.targetDate());
    goal.setReviewFrequency(request.reviewFrequency());
    goal.setWeeklyWorkoutTarget(request.weeklyWorkoutTarget());
  }

  private void validateDates(SaveGoalRequest request) {
    if (request.startDate() != null
        && request.targetDate() != null
        && request.targetDate().isBefore(request.startDate())) {
      throw new InvalidRequestException("Target date can't be before the start date");
    }
  }

  /** A goal is blocked while any goal that BLOCKS it is still unfinished. */
  private boolean isBlocked(UUID goalId, List<GoalLink> links, Map<UUID, Goal> goalsById) {
    return links.stream()
        .filter(l -> l.getLinkType() == GoalLinkType.BLOCKS && goalId.equals(l.getTargetGoalId()))
        .map(l -> goalsById.get(l.getSourceGoalId()))
        .anyMatch(
            blocker ->
                blocker != null
                    && blocker.getStatus() != GoalStatus.COMPLETED
                    && blocker.getStatus() != GoalStatus.ARCHIVED);
  }

  static GoalSummaryResponse toSummary(Goal goal, GoalProgress progress, boolean blocked) {
    GoalProgressCalculator.Result r = progress.result();
    boolean reviewDue =
        goal.getStatus().isInFlight()
            && goal.getNextReviewDate() != null
            && !goal.getNextReviewDate().isAfter(LocalDate.now());
    return new GoalSummaryResponse(
        goal.getId(),
        goal.getName(),
        goal.getDescription(),
        goal.getArea(),
        goal.getPriority() == null ? 3 : goal.getPriority(),
        progress.effectiveStatus(),
        goal.getStartDate(),
        goal.getTargetDate(),
        goal.getReviewFrequency(),
        goal.getNextReviewDate(),
        reviewDue,
        blocked,
        goal.getCompletedAt(),
        goal.getCreatedAt(),
        new GoalProgressBreakdownResponse(
            r.overallPct(),
            r.milestonePct(),
            r.taskPct(),
            r.habitPct(),
            r.metricPct(),
            r.workoutPct(),
            r.expectedPct(),
            progress.milestonesDone(),
            progress.milestonesTotal(),
            progress.tasksDone(),
            progress.tasksTotal(),
            progress.activeHabits(),
            progress.metricsCount(),
            progress.workoutSessions(),
            goal.getWeeklyWorkoutTarget()));
  }
}
