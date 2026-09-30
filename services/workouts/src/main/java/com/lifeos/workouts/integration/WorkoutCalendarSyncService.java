package com.lifeos.workouts.integration;

import com.lifeos.common.domains.dto.response.ApiResponse;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** Keeps a GYM event on the calendar for each scheduled or completed workout. Best-effort, same
 * contract as job-tracker's InterviewCalendarSyncService: calendar being unreachable must never
 * block scheduling, starting or finishing a workout, so every method swallows its failure with a
 * warning. Callers store whatever id comes back (null = not linked). */
@Service
public class WorkoutCalendarSyncService {

  private static final Logger log = LoggerFactory.getLogger(WorkoutCalendarSyncService.class);

  private static final ParameterizedTypeReference<ApiResponse<CreatedEvent>> CREATED_EVENT_TYPE =
      new ParameterizedTypeReference<>() {};

  private final RestClient calendarRestClient;
  private final String internalApiKey;

  public WorkoutCalendarSyncService(RestClient calendarRestClient, @Value("${internal.api-key}") String internalApiKey) {
    this.calendarRestClient = calendarRestClient;
    this.internalApiKey = internalApiKey;
  }

  public UUID createEvent(UUID userId, String title, Instant startAt, Instant endAt, UUID goalId) {
    CreateEventPayload payload = new CreateEventPayload(title, false, startAt, endAt, "GYM", "BUSY", "HEALTH", goalId);
    try {
      ApiResponse<CreatedEvent> response =
          calendarRestClient
              .post()
              .uri(uriBuilder -> uriBuilder.path("/v1/calendar/internal/events").queryParam("userId", userId).build())
              .header("X-Internal-Api-Key", internalApiKey)
              .body(payload)
              .retrieve()
              .body(CREATED_EVENT_TYPE);
      return response == null || response.getData() == null ? null : response.getData().id();
    } catch (Exception exception) {
      log.warn("Workout calendar sync: create failed, workout has no linked event ({})", exception.getMessage());
      return null;
    }
  }

  public void updateEvent(UUID userId, UUID eventId, String title, Instant startAt, Instant endAt, UUID goalId) {
    if (eventId == null) return;
    try {
      calendarRestClient
          .put()
          .uri(uriBuilder -> uriBuilder.path("/v1/calendar/internal/events/{id}").queryParam("userId", userId).build(eventId))
          .header("X-Internal-Api-Key", internalApiKey)
          .body(new UpdateEventPayload(title, startAt, endAt, goalId))
          .retrieve()
          .toBodilessEntity();
    } catch (Exception exception) {
      log.warn("Workout calendar sync: update failed for event {} ({})", eventId, exception.getMessage());
    }
  }

  public void deleteEvent(UUID userId, UUID eventId) {
    if (eventId == null) return;
    try {
      calendarRestClient
          .delete()
          .uri(uriBuilder -> uriBuilder.path("/v1/calendar/internal/events/{id}").queryParam("userId", userId).build(eventId))
          .header("X-Internal-Api-Key", internalApiKey)
          .retrieve()
          .toBodilessEntity();
    } catch (Exception exception) {
      log.warn("Workout calendar sync: delete failed for event {} ({})", eventId, exception.getMessage());
    }
  }

  private record CreateEventPayload(
      String title, boolean allDay, Instant startAt, Instant endAt, String category, String freeBusy, String area, UUID goalId) {}

  private record UpdateEventPayload(String title, Instant startAt, Instant endAt, UUID goalId) {}

  private record CreatedEvent(UUID id) {}
}
