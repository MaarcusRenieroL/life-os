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

/** Fetches per-goal habit consistency from habit-tracker. Best-effort by design, like
 * InterviewCalendarSyncService in job-tracker: habit-tracker being down just means goals show no
 * habit component for this load - it must never break the goals page. */
@Component
public class HabitStatsClient {

  private static final Logger log = LoggerFactory.getLogger(HabitStatsClient.class);

  private static final ParameterizedTypeReference<ApiResponse<Map<UUID, HabitStats>>> TYPE =
      new ParameterizedTypeReference<>() {};

  /** Mirrors habit-tracker's GoalHabitStatsResponse. */
  public record HabitStats(int activeHabits, int completions, int scheduledOccurrences) {}

  private final RestClient habitTrackerRestClient;
  private final String internalApiKey;

  public HabitStatsClient(
      RestClient habitTrackerRestClient, @Value("${internal.api-key}") String internalApiKey) {
    this.habitTrackerRestClient = habitTrackerRestClient;
    this.internalApiKey = internalApiKey;
  }

  public Map<UUID, HabitStats> statsByGoal(UUID userId) {
    try {
      ApiResponse<Map<UUID, HabitStats>> response =
          habitTrackerRestClient
              .get()
              .uri(
                  uriBuilder ->
                      uriBuilder
                          .path("/v1/habits/internal/goal-habit-stats")
                          .queryParam("userId", userId)
                          .build())
              .header("X-Internal-Api-Key", internalApiKey)
              .retrieve()
              .body(TYPE);
      return response == null || response.getData() == null ? Map.of() : response.getData();
    } catch (Exception exception) {
      log.warn("Goals: habit-tracker did not respond, omitting habit progress ({})", exception.getMessage());
      return Map.of();
    }
  }
}
