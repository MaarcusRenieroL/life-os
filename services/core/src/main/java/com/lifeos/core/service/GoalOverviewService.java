package com.lifeos.core.service;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.response.GoalOverviewResponse;
import com.lifeos.core.domains.dto.response.TaskGoalProgress;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** Fans out to tasks/habit-tracker/calendar and merges each module's own per-goal numbers into
 * one cross-module view - "how is this goal actually going" instead of three separate module
 * pages. Same isolated-failure fan-out pattern as TodayService: a module being down just means
 * its column of numbers is 0 for this load, not a broken page.
 *
 * <p>The goal list itself comes from tasks (Goal lives in tasks_schema, see its own javadoc) -
 * only goals with at least one linked task appear here. A goal that only has linked habits or
 * events but no tasks is invisible to this view; a reasonable follow-up (tasks would need to
 * expose the full goal list, not just goals with linked tasks) if that turns out to matter. */
@Service
public class GoalOverviewService {

  private static final Logger log = LoggerFactory.getLogger(GoalOverviewService.class);

  private static final ParameterizedTypeReference<ApiResponse<List<TaskGoalProgress>>>
      GOAL_PROGRESS_TYPE = new ParameterizedTypeReference<>() {};
  private static final ParameterizedTypeReference<ApiResponse<Map<UUID, Long>>> GOAL_COUNTS_TYPE =
      new ParameterizedTypeReference<>() {};

  private final RestClient tasksRestClient;
  private final RestClient habitTrackerRestClient;
  private final RestClient calendarRestClient;
  private final String internalApiKey;

  public GoalOverviewService(
      RestClient tasksRestClient,
      RestClient habitTrackerRestClient,
      RestClient calendarRestClient,
      @Value("${internal.api-key}") String internalApiKey) {
    this.tasksRestClient = tasksRestClient;
    this.habitTrackerRestClient = habitTrackerRestClient;
    this.calendarRestClient = calendarRestClient;
    this.internalApiKey = internalApiKey;
  }

  public List<GoalOverviewResponse> get(UUID userId) {
    CompletableFuture<List<TaskGoalProgress>> goalProgress =
        CompletableFuture.supplyAsync(() -> fetchGoalProgress(userId));
    CompletableFuture<Map<UUID, Long>> habitCounts =
        CompletableFuture.supplyAsync(() -> fetchGoalCounts(habitTrackerRestClient, "/v1/habits/internal/goal-habit-counts", userId, "habit-tracker"));
    CompletableFuture<Map<UUID, Long>> eventCounts =
        CompletableFuture.supplyAsync(() -> fetchGoalCounts(calendarRestClient, "/v1/calendar/internal/goal-event-counts", userId, "calendar"));

    List<TaskGoalProgress> goals = goalProgress.join();
    Map<UUID, Long> habits = habitCounts.join();
    Map<UUID, Long> events = eventCounts.join();

    return goals.stream()
        .map(
            g ->
                GoalOverviewResponse.builder()
                    .goalId(g.getGoalId())
                    .goalName(g.getGoalName())
                    .totalTasks(g.getTotalTasks())
                    .completedTasks(g.getCompletedTasks())
                    .activeHabitCount(habits.getOrDefault(g.getGoalId(), 0L))
                    .upcomingEventCount(events.getOrDefault(g.getGoalId(), 0L))
                    .build())
        .toList();
  }

  private List<TaskGoalProgress> fetchGoalProgress(UUID userId) {
    try {
      ApiResponse<List<TaskGoalProgress>> response =
          tasksRestClient
              .get()
              .uri(uriBuilder -> uriBuilder.path("/v1/tasks/internal/goal-progress").queryParam("userId", userId).build())
              .header("X-Internal-Api-Key", internalApiKey)
              .retrieve()
              .body(GOAL_PROGRESS_TYPE);
      return response == null || response.getData() == null ? List.of() : response.getData();
    } catch (Exception exception) {
      log.warn("Goal overview: tasks did not respond, omitting task/goal data ({})", exception.getMessage());
      return List.of();
    }
  }

  private Map<UUID, Long> fetchGoalCounts(RestClient restClient, String path, UUID userId, String serviceName) {
    try {
      ApiResponse<Map<UUID, Long>> response =
          restClient
              .get()
              .uri(uriBuilder -> uriBuilder.path(path).queryParam("userId", userId).build())
              .header("X-Internal-Api-Key", internalApiKey)
              .retrieve()
              .body(GOAL_COUNTS_TYPE);
      return response == null || response.getData() == null ? Map.of() : response.getData();
    } catch (Exception exception) {
      log.warn("Goal overview: {} did not respond, omitting its counts ({})", serviceName, exception.getMessage());
      return Map.of();
    }
  }
}
