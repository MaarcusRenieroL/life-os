package com.lifeos.core.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.core.domains.record.EmailAction;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/** Talks to the owning modules over their internal, API-key-protected endpoints - the same route
 * quick capture and the automation rules use. */
@Component
public class RestEmailActionExecutor implements EmailActionExecutor {

  private static final String KEY_HEADER = "X-Internal-Api-Key";

  private final RestClient tasksRestClient;
  private final RestClient calendarRestClient;
  private final RestClient financeTrackerRestClient;
  private final String internalApiKey;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  public RestEmailActionExecutor(
      RestClient tasksRestClient,
      RestClient calendarRestClient,
      RestClient financeTrackerRestClient,
      @Value("${internal.api-key}") String internalApiKey) {
    this.tasksRestClient = tasksRestClient;
    this.calendarRestClient = calendarRestClient;
    this.financeTrackerRestClient = financeTrackerRestClient;
    this.internalApiKey = internalApiKey;
  }

  @Override
  public Result execute(UUID userId, EmailAction action) {
    return switch (action.kind()) {
      case "TASK" -> createTask(userId, action);
      case "EVENT" -> createEvent(userId, action);
      case "SUBSCRIPTION" -> createSubscription(userId, action);
      default -> throw new EmailActionException("Unknown action: " + action.kind());
    };
  }

  private Result createTask(UUID userId, EmailAction a) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("title", a.title());
    body.put("description", a.description());
    body.put("priority", a.priority() == null ? "MEDIUM" : a.priority());
    body.put("dueDate", a.dueDate() == null ? null : a.dueDate().toString());
    body.put("dueTime", a.dueTime() == null ? null : a.dueTime().toString());
    body.put("allDay", a.dueTime() == null);
    // A nudge the day before for anything with a real deadline.
    if (a.dueDate() != null) {
      body.put("reminderMinutesBefore", List.of(24 * 60));
    }
    JsonNode data = call(() -> tasksRestClient.post().uri("/v1/tasks/internal/automation/tasks?userId={u}", userId).header(KEY_HEADER, internalApiKey).body(body).retrieve().body(String.class));
    return new Result("tasks", id(data), true, null);
  }

  private Result createEvent(UUID userId, EmailAction a) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("title", a.title());
    body.put("description", a.description());
    body.put("location", a.location());
    body.put("category", "PERSONAL");
    body.put("allDay", a.allDay());
    if (a.allDay()) {
      body.put("startDate", a.startDate().toString());
      body.put("endDate", (a.endDate() == null ? a.startDate() : a.endDate()).toString());
    } else {
      body.put("startAt", a.startAt().toString());
      body.put("endAt", a.endAt().toString());
      body.put("reminderMinutesBefore", List.of(60));
    }
    JsonNode data = call(() -> calendarRestClient.post().uri("/v1/calendar/internal/events?userId={u}", userId).header(KEY_HEADER, internalApiKey).body(body).retrieve().body(String.class));
    return new Result("calendar", id(data), true, null);
  }

  private Result createSubscription(UUID userId, EmailAction a) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("name", a.title());
    body.put("amount", a.amount());
    body.put("billingCycle", a.billingCycle());
    body.put("nextBillingDate", a.nextBillingDate() == null ? null : a.nextBillingDate().toString());
    body.put("notes", "Found in your email");
    JsonNode data = call(() -> financeTrackerRestClient.post().uri("/v1/finance/internal/subscriptions?userId={u}", userId).header(KEY_HEADER, internalApiKey).body(body).retrieve().body(String.class));
    boolean created = data.path("created").asBoolean(true);
    return new Result("finance", id(data), created, created ? null : "Already in your subscriptions");
  }

  @Override
  public void undo(UUID userId, String module, String targetId) {
    try {
      delete(userId, module, targetId);
    } catch (EmailActionException failure) {
      // Already deleted by hand: the goal of an undo is reached, so it is not a failure.
      if (failure.getCause() instanceof RestClientResponseException http && http.getStatusCode().value() == 404) {
        return;
      }
      throw failure;
    }
  }

  private void delete(UUID userId, String module, String targetId) {
    switch (module) {
      case "tasks" -> call(() -> tasksRestClient.delete().uri("/v1/tasks/internal/automation/tasks/{id}?userId={u}", targetId, userId).header(KEY_HEADER, internalApiKey).retrieve().body(String.class));
      case "calendar" -> call(() -> calendarRestClient.delete().uri("/v1/calendar/internal/events/{id}?userId={u}", targetId, userId).header(KEY_HEADER, internalApiKey).retrieve().body(String.class));
      case "finance" -> call(() -> financeTrackerRestClient.delete().uri("/v1/finance/internal/subscriptions/{id}?userId={u}", targetId, userId).header(KEY_HEADER, internalApiKey).retrieve().body(String.class));
      default -> throw new EmailActionException("Can't undo a change in " + module);
    }
  }

  /** Runs one call and returns the response's {@code data} node, turning any failure into a
   * readable message rather than a raw HTTP exception. */
  private JsonNode call(java.util.function.Supplier<String> request) {
    try {
      String raw = request.get();
      JsonNode root = raw == null || raw.isBlank() ? null : objectMapper.readTree(raw);
      return root == null ? objectMapper.createObjectNode() : root.path("data");
    } catch (RestClientResponseException exception) {
      throw new EmailActionException(describe(exception), exception);
    } catch (RestClientException exception) {
      throw new EmailActionException("Couldn't reach that module: " + exception.getMessage(), exception);
    } catch (Exception exception) {
      throw new EmailActionException("Unexpected response: " + exception.getMessage(), exception);
    }
  }

  private String describe(RestClientResponseException exception) {
    try {
      String message = objectMapper.readTree(exception.getResponseBodyAsString()).path("message").asText(null);
      if (message != null && !message.isBlank()) {
        return message;
      }
    } catch (Exception ignored) {
      // fall through to the status line
    }
    return "The module answered " + exception.getStatusCode().value();
  }

  private static String id(JsonNode data) {
    String id = data.path("id").asText(null);
    if (id == null || id.isBlank()) {
      throw new EmailActionException("The module did not return an id for what it created");
    }
    return id;
  }
}
