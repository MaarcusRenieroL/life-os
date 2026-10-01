package com.lifeos.core.automation;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.analytics.AnalyticsModels.PeriodSummary;
import com.lifeos.core.analytics.AnalyticsService;
import com.lifeos.core.domains.entity.Notification;
import com.lifeos.core.repository.NotificationRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Carries out a rule's action. The changes to other modules go through their internal
 * "automation" endpoints (which don't publish automation events, so a rule can't trigger rules);
 * notifications and reports are written straight to core's own notifications table. Never throws:
 * a failure is returned as a result and recorded against the rule. */
@Component
public class ActionExecutor {

  private static final Logger log = LoggerFactory.getLogger(ActionExecutor.class);

  /** What the rule is acting on. entityId/entityType are null for schedule, threshold and manual
   * runs, which have no triggering item. vars feed {{placeholders}}. */
  public record Context(UUID userId, String entityType, UUID entityId, Map<String, String> vars) {}

  public record Result(boolean success, String message) {}

  private final RestClient tasksRestClient;
  private final RestClient calendarRestClient;
  private final NotificationRepository notificationRepository;
  private final AnalyticsService analyticsService;
  private final String internalApiKey;
  private final ZoneId zone;

  public ActionExecutor(
      RestClient tasksRestClient,
      RestClient calendarRestClient,
      NotificationRepository notificationRepository,
      AnalyticsService analyticsService,
      @Value("${internal.api-key}") String internalApiKey,
      @Value("${analytics.zone:Asia/Kolkata}") String zone) {
    this.tasksRestClient = tasksRestClient;
    this.calendarRestClient = calendarRestClient;
    this.notificationRepository = notificationRepository;
    this.analyticsService = analyticsService;
    this.internalApiKey = internalApiKey;
    this.zone = ZoneId.of(zone);
  }

  public Result execute(ActionType type, Map<String, Object> config, Context ctx) {
    try {
      return switch (type) {
        case CREATE_TASK -> createTask(config, ctx);
        case CREATE_EVENT -> createEvent(config, ctx);
        case SEND_NOTIFICATION -> sendNotification(config, ctx);
        case LINK_ITEMS -> linkItems(config, ctx);
        case UPDATE_STATUS -> updateStatus(config, ctx);
        case GENERATE_REPORT -> generateReport(config, ctx);
      };
    } catch (Exception exception) {
      log.warn("Automation action {} failed: {}", type, exception.getMessage());
      return new Result(false, "Failed: " + exception.getMessage());
    }
  }

  private Result createTask(Map<String, Object> config, Context ctx) {
    Map<String, Object> body = new HashMap<>();
    body.put("title", TemplateRenderer.render(str(config, "title"), ctx.vars()));
    if (config.get("description") != null) body.put("description", TemplateRenderer.render(str(config, "description"), ctx.vars()));
    if (config.get("priority") != null) body.put("priority", str(config, "priority"));
    if (config.get("goalId") != null) body.put("goalId", str(config, "goalId"));
    int dueIn = config.get("dueInDays") == null ? -1 : ((Number) config.get("dueInDays")).intValue();
    if (dueIn >= 0) body.put("dueDate", LocalDate.now(zone).plusDays(dueIn).toString());

    ApiResponse<Map<String, Object>> response =
        tasksRestClient
            .post()
            .uri(b -> b.path("/v1/tasks/internal/automation/tasks").queryParam("userId", ctx.userId()).build())
            .header("X-Internal-Api-Key", internalApiKey)
            .body(body)
            .retrieve()
            .body(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {});
    return new Result(true, "Created task \"" + body.get("title") + "\"" + (response == null ? "" : ""));
  }

  private Result createEvent(Map<String, Object> config, Context ctx) {
    int startIn = config.get("startInDays") == null ? 1 : ((Number) config.get("startInDays")).intValue();
    int hour = config.get("hour") == null ? 9 : ((Number) config.get("hour")).intValue();
    int minutes = config.get("durationMinutes") == null ? 60 : ((Number) config.get("durationMinutes")).intValue();
    Instant start = LocalDate.now(zone).plusDays(startIn).atTime(hour, 0).atZone(zone).toInstant();

    Map<String, Object> body = new HashMap<>();
    String title = TemplateRenderer.render(str(config, "title"), ctx.vars());
    body.put("title", title);
    body.put("allDay", false);
    body.put("startAt", start.toString());
    body.put("endAt", start.plusSeconds(minutes * 60L).toString());
    body.put("category", config.get("category") == null ? "OTHER" : str(config, "category"));
    body.put("freeBusy", "BUSY");
    if (config.get("description") != null) body.put("description", TemplateRenderer.render(str(config, "description"), ctx.vars()));

    calendarRestClient
        .post()
        .uri(b -> b.path("/v1/calendar/internal/events").queryParam("userId", ctx.userId()).build())
        .header("X-Internal-Api-Key", internalApiKey)
        .body(body)
        .retrieve()
        .toBodilessEntity();
    return new Result(true, "Created event \"" + title + "\"");
  }

  private Result sendNotification(Map<String, Object> config, Context ctx) {
    String title = TemplateRenderer.render(str(config, "title"), ctx.vars());
    String text = config.get("body") == null ? null : TemplateRenderer.render(str(config, "body"), ctx.vars());
    save(ctx.userId(), "AUTOMATION", title, text);
    return new Result(true, "Sent notification \"" + title + "\"");
  }

  private Result linkItems(Map<String, Object> config, Context ctx) {
    if (ctx.entityId() == null || !"TASK".equals(ctx.entityType())) return new Result(false, "There's no task to link on this run");
    tasksRestClient
        .put()
        .uri(b -> b.path("/v1/tasks/internal/automation/tasks/{id}/goal").queryParam("userId", ctx.userId()).build(ctx.entityId()))
        .header("X-Internal-Api-Key", internalApiKey)
        .body(Map.of("goalId", str(config, "goalId")))
        .retrieve()
        .toBodilessEntity();
    return new Result(true, "Linked the task to the goal");
  }

  private Result updateStatus(Map<String, Object> config, Context ctx) {
    if (ctx.entityId() == null) return new Result(false, "There's no item to update on this run");
    String status = str(config, "status");
    String path = "TASK".equals(ctx.entityType()) ? "/v1/tasks/internal/automation/tasks/{id}/status" : "/v1/tasks/internal/automation/goals/{id}/status";
    if ("GOAL".equals(ctx.entityType())) {
      tasksRestClient.post().uri(b -> b.path(path).queryParam("userId", ctx.userId()).build(ctx.entityId())).header("X-Internal-Api-Key", internalApiKey).body(Map.of("status", status)).retrieve().toBodilessEntity();
    } else {
      tasksRestClient.put().uri(b -> b.path(path).queryParam("userId", ctx.userId()).build(ctx.entityId())).header("X-Internal-Api-Key", internalApiKey).body(Map.of("status", status)).retrieve().toBodilessEntity();
    }
    return new Result(true, "Set the " + ctx.entityType().toLowerCase() + " to " + status);
  }

  private Result generateReport(Map<String, Object> config, Context ctx) {
    PeriodSummary summary = analyticsService.summary(ctx.userId(), str(config, "period"), null);
    save(ctx.userId(), "REPORT", ReportFormatter.title(summary), ReportFormatter.body(summary));
    return new Result(true, "Generated the " + summary.period().toLowerCase() + "ly report");
  }

  private void save(UUID userId, String type, String title, String body) {
    notificationRepository.save(
        Notification.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .module("automation")
            .type(type)
            .title(title.length() > 255 ? title.substring(0, 255) : title)
            .body(body)
            .read(false)
            .occurredAt(Instant.now())
            .build());
  }

  private static String str(Map<String, Object> config, String key) {
    return String.valueOf(config.get(key));
  }
}
