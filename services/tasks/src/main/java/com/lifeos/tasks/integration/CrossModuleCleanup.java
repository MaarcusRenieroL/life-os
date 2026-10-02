package com.lifeos.tasks.integration;

import java.util.UUID;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestClient;

/**
 * The modules only share ids (there are no cross-service constraints), so deleting a goal or a task here would
 * leave habits, calendar events, workouts and notes pointing at something that no longer exists. This tells
 * them, after the delete has committed.
 *
 * <p>Best-effort by design, like {@link HabitStatsClient}: a module that is down just keeps a stale id (which
 * the UI already tolerates) and the delete itself never fails because of it.
 */
@Component
public class CrossModuleCleanup {

  private static final Logger log = LoggerFactory.getLogger(CrossModuleCleanup.class);

  private final RestClient habitTracker;
  private final RestClient workouts;
  private final RestClient calendar;
  private final RestClient notes;
  private final String internalApiKey;

  public CrossModuleCleanup(
      @Qualifier("habitTrackerRestClient") RestClient habitTracker,
      @Qualifier("workoutsRestClient") RestClient workouts,
      @Qualifier("calendarRestClient") RestClient calendar,
      @Qualifier("notesRestClient") RestClient notes,
      @Value("${internal.api-key}") String internalApiKey) {
    this.habitTracker = habitTracker;
    this.workouts = workouts;
    this.calendar = calendar;
    this.notes = notes;
    this.internalApiKey = internalApiKey;
  }

  public void goalDeleted(UUID userId, UUID goalId) {
    afterCommit(
        () -> {
          post(habitTracker, "/v1/habits/internal/goals/" + goalId + "/detach", userId, "habit-tracker");
          post(workouts, "/v1/workouts/internal/goals/" + goalId + "/detach", userId, "workouts");
          post(calendar, "/v1/calendar/internal/goals/" + goalId + "/detach", userId, "calendar");
          deleteLinks(userId, "GOAL", goalId);
        });
  }

  public void taskDeleted(UUID userId, UUID taskId) {
    afterCommit(
        () -> {
          post(calendar, "/v1/calendar/internal/tasks/" + taskId + "/detach", userId, "calendar");
          deleteLinks(userId, "TASK", taskId);
        });
  }

  private void post(RestClient client, String path, UUID userId, String module) {
    call(module, () -> client.post().uri(b -> b.path(path).queryParam("userId", userId).build()).header("X-Internal-Api-Key", internalApiKey).retrieve().toBodilessEntity());
  }

  private void deleteLinks(UUID userId, String type, UUID id) {
    call("notes", () -> notes.delete().uri(b -> b.path("/v1/notes/internal/module-links/" + type + "/" + id).queryParam("userId", userId).build()).header("X-Internal-Api-Key", internalApiKey).retrieve().toBodilessEntity());
  }

  private void call(String module, Runnable request) {
    try {
      request.run();
    } catch (Exception exception) {
      log.warn("Cleanup after delete: {} did not respond, it keeps a stale reference ({})", module, exception.getMessage());
    }
  }

  /** Runs once the surrounding transaction has committed; immediately if there is none. */
  private static void afterCommit(Runnable action) {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              action.run();
            }
          });
    } else {
      action.run();
    }
  }
}
