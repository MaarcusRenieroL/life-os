package com.lifeos.tasks.integration;

import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Fetches per-goal workout counts from workouts. Best-effort like HabitStatsClient: workouts
 * being down just means goals show no workout component for this load. */
@Component
public class WorkoutStatsClient {

  private static final Logger log = LoggerFactory.getLogger(WorkoutStatsClient.class);

  private static final ParameterizedTypeReference<ApiResponse<Map<UUID, WorkoutStats>>> TYPE =
      new ParameterizedTypeReference<>() {};

  /** Mirrors workouts' GoalWorkoutStatsResponse. */
  public record WorkoutStats(int sessionsLast28Days, int totalSessions) {}

  private final RestClient workoutsRestClient;
  private final String internalApiKey;

  public WorkoutStatsClient(RestClient workoutsRestClient, @Value("${internal.api-key}") String internalApiKey) {
    this.workoutsRestClient = workoutsRestClient;
    this.internalApiKey = internalApiKey;
  }

  public Map<UUID, WorkoutStats> statsByGoal(UUID userId) {
    try {
      ApiResponse<Map<UUID, WorkoutStats>> response =
          workoutsRestClient
              .get()
              .uri(uriBuilder -> uriBuilder.path("/v1/workouts/internal/goal-workout-stats").queryParam("userId", userId).build())
              .header("X-Internal-Api-Key", internalApiKey)
              .retrieve()
              .body(TYPE);
      return response == null || response.getData() == null ? Map.of() : response.getData();
    } catch (Exception exception) {
      log.warn("Goals: workouts did not respond, omitting workout progress ({})", exception.getMessage());
      return Map.of();
    }
  }
}
