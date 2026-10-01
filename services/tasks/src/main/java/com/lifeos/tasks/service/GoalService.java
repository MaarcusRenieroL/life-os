package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.dto.request.CreateGoalRequest;
import com.lifeos.tasks.domains.dto.response.GoalProgressResponse;
import com.lifeos.tasks.domains.dto.response.GoalResponse;
import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.GoalRepository;
import com.lifeos.tasks.repository.TaskRepository;
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
public class GoalService {

  private final GoalRepository goalRepository;
  private final TaskRepository taskRepository;

  @Transactional(readOnly = true)
  public List<GoalResponse> list(UUID userId) {
    return goalRepository.findAllByUserIdOrderByNameAsc(userId).stream().map(this::toResponse).toList();
  }

  /** Every goal that has at least one linked task, with that goal's task completion count - see
   * GoalProgressResponse's javadoc for why this stays tasks-only rather than trying to also reach
   * into habit-tracker/calendar from here. A goal with zero linked tasks is omitted rather than
   * returned with totalTasks=0, since core's merge only needs goals that actually have something
   * to report. */
  @Transactional(readOnly = true)
  public List<GoalProgressResponse> goalProgress(UUID userId) {
    Map<UUID, String> goalNames =
        goalRepository.findAllByUserIdOrderByNameAsc(userId).stream()
            .collect(Collectors.toMap(Goal::getId, Goal::getName));

    Map<UUID, List<Task>> tasksByGoal =
        taskRepository.findAllByUserId(userId).stream()
            .filter(t -> t.getGoalId() != null)
            .collect(Collectors.groupingBy(Task::getGoalId));

    return tasksByGoal.entrySet().stream()
        .map(
            entry -> {
              UUID goalId = entry.getKey();
              List<Task> tasks = entry.getValue();
              long completed = tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
              return GoalProgressResponse.builder()
                  .goalId(goalId)
                  .goalName(goalNames.getOrDefault(goalId, "Unknown goal"))
                  .totalTasks(tasks.size())
                  .completedTasks(completed)
                  .build();
            })
        .toList();
  }

  public GoalResponse create(UUID userId, CreateGoalRequest request) {
    Goal goal = Goal.builder().userId(userId).name(request.getName().trim()).build();
    return toResponse(goalRepository.save(goal));
  }

  public void delete(UUID userId, UUID id) {
    Goal goal =
        goalRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Goal", id));
    goalRepository.delete(goal);
  }

  private GoalResponse toResponse(Goal goal) {
    return GoalResponse.builder()
        .id(goal.getId())
        .name(goal.getName())
        .createdAt(goal.getCreatedAt())
        .build();
  }
}
