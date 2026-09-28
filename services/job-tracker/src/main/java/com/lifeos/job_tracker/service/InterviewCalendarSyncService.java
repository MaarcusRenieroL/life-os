package com.lifeos.job_tracker.service;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.job_tracker.domains.entity.Interview;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** Keeps a best-effort calendar event in sync with a scheduled interview - job-tracker's first
 * outbound call to another module, rather than the one-directional stored-reference or
 * fire-and-forget-notification bridges every other cross-module link in this codebase uses so
 * far. "Best-effort" is deliberate: calendar being briefly unreachable must never block creating,
 * rescheduling, or deleting an interview - every method here catches its own failures, logs a
 * warning, and leaves Interview.calendarEventId as it was (null if a link was never established,
 * unchanged if an update/delete against an existing link failed). A later successful update call
 * will still try to sync against whatever calendarEventId is on file; it does not retry creating
 * a missing link on its own. */
@Service
public class InterviewCalendarSyncService {

  private static final Logger log = LoggerFactory.getLogger(InterviewCalendarSyncService.class);
  private static final Duration DEFAULT_DURATION = Duration.ofHours(1);

  private static final ParameterizedTypeReference<ApiResponse<CreatedEvent>> CREATED_EVENT_TYPE =
      new ParameterizedTypeReference<>() {};

  private final RestClient calendarRestClient;
  private final String internalApiKey;

  public InterviewCalendarSyncService(RestClient calendarRestClient, @Value("${internal.api-key}") String internalApiKey) {
    this.calendarRestClient = calendarRestClient;
    this.internalApiKey = internalApiKey;
  }

  /** Creates a linked event if the interview has a scheduledAt, returning the new event's id (or
   * null if there's nothing to schedule, or calendar didn't respond). */
  public UUID createLinkedEvent(UUID userId, Interview interview, String companyName) {
    if (interview.getScheduledAt() == null) return null;

    CreateEventPayload payload =
        new CreateEventPayload(
            title(interview, companyName),
            false,
            interview.getScheduledAt(),
            interview.getScheduledAt().plus(DEFAULT_DURATION),
            "JOB",
            "BUSY");

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
      log.warn("Interview calendar sync: create failed, interview has no linked event ({})", exception.getMessage());
      return null;
    }
  }

  /** Updates the linked event's title/time to match the interview - a no-op if the interview was
   * never successfully linked (calendarEventId null). */
  public void updateLinkedEvent(UUID userId, Interview interview, String companyName) {
    if (interview.getCalendarEventId() == null || interview.getScheduledAt() == null) return;

    UpdateEventPayload payload =
        new UpdateEventPayload(title(interview, companyName), interview.getScheduledAt(), interview.getScheduledAt().plus(DEFAULT_DURATION));

    try {
      calendarRestClient
          .put()
          .uri(
              uriBuilder ->
                  uriBuilder
                      .path("/v1/calendar/internal/events/{id}")
                      .queryParam("userId", userId)
                      .build(interview.getCalendarEventId()))
          .header("X-Internal-Api-Key", internalApiKey)
          .body(payload)
          .retrieve()
          .toBodilessEntity();
    } catch (Exception exception) {
      log.warn("Interview calendar sync: update failed for event {} ({})", interview.getCalendarEventId(), exception.getMessage());
    }
  }

  /** Best-effort delete of the linked event - a no-op if the interview was never linked. */
  public void deleteLinkedEvent(UUID userId, Interview interview) {
    if (interview.getCalendarEventId() == null) return;

    try {
      calendarRestClient
          .delete()
          .uri(
              uriBuilder ->
                  uriBuilder
                      .path("/v1/calendar/internal/events/{id}")
                      .queryParam("userId", userId)
                      .build(interview.getCalendarEventId()))
          .header("X-Internal-Api-Key", internalApiKey)
          .retrieve()
          .toBodilessEntity();
    } catch (Exception exception) {
      log.warn("Interview calendar sync: delete failed for event {} ({})", interview.getCalendarEventId(), exception.getMessage());
    }
  }

  private String title(Interview interview, String companyName) {
    String round = interview.getRoundType() == null ? "Interview" : humanize(interview.getRoundType().name());
    return round + " interview - " + companyName;
  }

  private String humanize(String enumName) {
    String[] words = enumName.split("_");
    StringBuilder builder = new StringBuilder();
    for (String word : words) {
      if (!builder.isEmpty()) builder.append(' ');
      builder.append(word.charAt(0)).append(word.substring(1).toLowerCase());
    }
    return builder.toString();
  }

  private record CreateEventPayload(String title, boolean allDay, Instant startAt, Instant endAt, String category, String freeBusy) {}

  private record UpdateEventPayload(String title, Instant startAt, Instant endAt) {}

  private record CreatedEvent(UUID id) {}
}
