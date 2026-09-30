package com.lifeos.core.analytics;

import com.lifeos.common.domains.dto.response.ApiResponse;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Fans out to every module's internal stats endpoint in parallel and returns a
 * {@link ModuleData.Bundle}. Same isolated-failure contract as TodayService: a module that's down
 * or slow contributes null and is listed in `unavailable` - it never fails the whole request. */
@Component
public class ModuleDataClient {

  private static final Logger log = LoggerFactory.getLogger(ModuleDataClient.class);

  private final RestClient tasks;
  private final RestClient habits;
  private final RestClient finance;
  private final RestClient workouts;
  private final RestClient notes;
  private final RestClient jobs;
  private final String internalApiKey;
  private final String zone;

  public ModuleDataClient(
      RestClient tasksRestClient,
      RestClient habitTrackerRestClient,
      RestClient financeTrackerRestClient,
      RestClient workoutsRestClient,
      RestClient notesRestClient,
      RestClient jobTrackerRestClient,
      @Value("${internal.api-key}") String internalApiKey,
      @Value("${analytics.zone:Asia/Kolkata}") String zone) {
    this.tasks = tasksRestClient;
    this.habits = habitTrackerRestClient;
    this.finance = financeTrackerRestClient;
    this.workouts = workoutsRestClient;
    this.notes = notesRestClient;
    this.jobs = jobTrackerRestClient;
    this.internalApiKey = internalApiKey;
    this.zone = zone;
  }

  public String zone() {
    return zone;
  }

  public ModuleData.Bundle fetch(UUID userId, LocalDate from, LocalDate to) {
    List<String> unavailable = new ArrayList<>();
    var t = async(() -> get(tasks, "/v1/tasks/internal/daily-stats", userId, from, to, true, new ParameterizedTypeReference<ApiResponse<ModuleData.TaskStats>>() {}), "tasks", unavailable);
    var h = async(() -> get(habits, "/v1/habits/internal/daily-stats", userId, from, to, false, new ParameterizedTypeReference<ApiResponse<ModuleData.HabitStats>>() {}), "habits", unavailable);
    var f = async(() -> get(finance, "/v1/finance/internal/daily-stats", userId, from, to, true, new ParameterizedTypeReference<ApiResponse<ModuleData.SpendStats>>() {}), "finance", unavailable);
    var w = async(() -> get(workouts, "/v1/workouts/internal/daily-stats", userId, from, to, true, new ParameterizedTypeReference<ApiResponse<ModuleData.WorkoutStats>>() {}), "workouts", unavailable);
    var j = async(() -> get(notes, "/v1/notes/internal/journal-daily", userId, from, to, false, new ParameterizedTypeReference<ApiResponse<ModuleData.JournalStats>>() {}), "journal", unavailable);
    var a = async(() -> get(jobs, "/v1/jobs/internal/application-stats", userId, from, to, true, new ParameterizedTypeReference<ApiResponse<ModuleData.ApplicationStats>>() {}), "job tracker", unavailable);
    var g = async(() -> goals(userId), "goals", unavailable);

    return new ModuleData.Bundle(t.join(), h.join(), f.join(), w.join(), j.join(), a.join(), g.join(), List.copyOf(unavailable));
  }

  /** Just the pieces one caller needs, when fetching everything would be wasteful. */
  public ModuleData.SpendStats spending(UUID userId, LocalDate from, LocalDate to) {
    return safely(() -> get(finance, "/v1/finance/internal/daily-stats", userId, from, to, true, new ParameterizedTypeReference<ApiResponse<ModuleData.SpendStats>>() {}), "finance");
  }

  public List<ModuleData.GoalSummary> goals(UUID userId) {
    return safely(
        () ->
            tasks
                .get()
                .uri(b -> b.path("/v1/tasks/internal/goal-summaries").queryParam("userId", userId).build())
                .header("X-Internal-Api-Key", internalApiKey)
                .retrieve()
                .body(new ParameterizedTypeReference<ApiResponse<List<ModuleData.GoalSummary>>>() {})
                .getData(),
        "goals");
  }

  private <T> CompletableFuture<T> async(Supplier<T> call, String module, List<String> unavailable) {
    return CompletableFuture.supplyAsync(
        () -> {
          T result = safely(call, module);
          if (result == null) {
            synchronized (unavailable) {
              unavailable.add(module);
            }
          }
          return result;
        });
  }

  private <T> T safely(Supplier<T> call, String module) {
    try {
      return call.get();
    } catch (Exception exception) {
      log.warn("Analytics: {} did not respond, omitting its numbers ({})", module, exception.getMessage());
      return null;
    }
  }

  private <T> T get(RestClient client, String path, UUID userId, LocalDate from, LocalDate to, boolean withZone, ParameterizedTypeReference<ApiResponse<T>> type) {
    ApiResponse<T> response =
        client
            .get()
            .uri(
                b -> {
                  b.path(path).queryParam("userId", userId).queryParam("from", from).queryParam("to", to);
                  if (withZone) b.queryParam("zone", zone);
                  return b.build();
                })
            .header("X-Internal-Api-Key", internalApiKey)
            .retrieve()
            .body(type);
    return response == null ? null : response.getData();
  }
}
