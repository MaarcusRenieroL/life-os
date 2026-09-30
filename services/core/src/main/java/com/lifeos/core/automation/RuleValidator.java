package com.lifeos.core.automation;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Checks a rule's trigger and action configuration on write, so everything stored is something
 * the engine can actually run - and so a typo is a clear 400 now rather than a silent
 * "FAILED" execution at 3 a.m. Throws IllegalArgumentException (mapped to 400). */
public final class RuleValidator {

  static final Set<String> ENTITY_TYPES = Set.of("TASK", "GOAL", "JOB_APPLICATION", "HABIT");
  static final Set<String> COMPLETABLE = Set.of("TASK", "GOAL", "HABIT");
  static final Set<String> THRESHOLD_METRICS = Set.of("GOAL_PROGRESS_BELOW", "HABIT_CONSISTENCY_BELOW", "WEEKLY_SPEND_ABOVE", "OVERDUE_TASKS_ABOVE");
  static final Set<String> PERCENT_METRICS = Set.of("GOAL_PROGRESS_BELOW", "HABIT_CONSISTENCY_BELOW");
  static final Set<String> PRIORITIES = Set.of("URGENT", "HIGH", "MEDIUM", "LOW");
  static final Set<String> EVENT_CATEGORIES = Set.of("WORK", "PERSONAL", "FOCUS", "GYM", "JOB", "OTHER");
  static final Set<String> TASK_STATUSES = Set.of("TODO", "IN_PROGRESS", "DONE", "BLOCKED");
  static final Set<String> GOAL_STATUSES = Set.of("ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED");
  static final Set<String> REPORT_PERIODS = Set.of("WEEK", "MONTH");
  static final Set<String> FREQUENCIES = Set.of("DAILY", "WEEKLY", "MONTHLY");

  private RuleValidator() {}

  public static void validate(TriggerType triggerType, Map<String, Object> trigger, ActionType actionType, Map<String, Object> action) {
    if (triggerType == null) throw new IllegalArgumentException("Choose a trigger");
    if (actionType == null) throw new IllegalArgumentException("Choose an action");
    Map<String, Object> t = trigger == null ? Map.of() : trigger;
    Map<String, Object> a = action == null ? Map.of() : action;

    validateTrigger(triggerType, t);
    validateAction(actionType, a);
    validateCombination(triggerType, t, actionType, a);
  }

  private static void validateTrigger(TriggerType type, Map<String, Object> t) {
    switch (type) {
      case ON_CREATE, ON_COMPLETE, ON_UPDATE -> {
        String entity = string(t, "entityType");
        require(entity != null && ENTITY_TYPES.contains(entity), "Trigger needs an entityType: " + ENTITY_TYPES);
        if (type == TriggerType.ON_COMPLETE) require(COMPLETABLE.contains(entity), "Only tasks, goals and habits can be completed");
        Object conditions = t.get("conditions");
        if (conditions != null) require(conditions instanceof Map<?, ?>, "conditions must be a set of field: value pairs");
      }
      case SCHEDULED -> {
        String frequency = string(t, "frequency");
        require(frequency != null && FREQUENCIES.contains(frequency), "Schedule frequency must be DAILY, WEEKLY or MONTHLY");
        try {
          LocalTime.parse(String.valueOf(t.get("time")));
        } catch (DateTimeParseException exception) {
          throw new IllegalArgumentException("Schedule needs a time like 18:30");
        }
        if (frequency.equals("WEEKLY")) require(intIn(t, "dayOfWeek", 1, 7), "Weekly schedule needs dayOfWeek 1 (Mon) to 7 (Sun)");
        if (frequency.equals("MONTHLY")) require(intIn(t, "dayOfMonth", 1, 31), "Monthly schedule needs dayOfMonth 1 to 31");
      }
      case THRESHOLD -> {
        String metric = string(t, "metric");
        require(metric != null && THRESHOLD_METRICS.contains(metric), "Threshold metric must be one of " + THRESHOLD_METRICS);
        Double value = number(t, "value");
        require(value != null && value >= 0, "Threshold needs a value");
        if (PERCENT_METRICS.contains(metric)) require(value <= 100, "A percentage threshold can't exceed 100");
        if (t.get("goalId") != null) uuid(t, "goalId");
      }
    }
  }

  private static void validateAction(ActionType type, Map<String, Object> a) {
    switch (type) {
      case CREATE_TASK -> {
        require(text(a, "title"), "Create-task needs a title");
        if (a.get("priority") != null) require(PRIORITIES.contains(string(a, "priority")), "priority must be one of " + PRIORITIES);
        if (a.get("dueInDays") != null) require(intIn(a, "dueInDays", 0, 365), "dueInDays must be 0 to 365");
        if (a.get("goalId") != null) uuid(a, "goalId");
      }
      case CREATE_EVENT -> {
        require(text(a, "title"), "Create-event needs a title");
        if (a.get("startInDays") != null) require(intIn(a, "startInDays", 0, 365), "startInDays must be 0 to 365");
        if (a.get("hour") != null) require(intIn(a, "hour", 0, 23), "hour must be 0 to 23");
        if (a.get("durationMinutes") != null) require(intIn(a, "durationMinutes", 5, 1440), "durationMinutes must be 5 to 1440");
        if (a.get("category") != null) require(EVENT_CATEGORIES.contains(string(a, "category")), "category must be one of " + EVENT_CATEGORIES);
      }
      case SEND_NOTIFICATION -> require(text(a, "title"), "Send-notification needs a title");
      case LINK_ITEMS -> uuid(a, "goalId");
      case UPDATE_STATUS -> require(string(a, "status") != null, "Update-status needs a status");
      case GENERATE_REPORT -> require(REPORT_PERIODS.contains(string(a, "period")), "Report period must be WEEK or MONTH");
    }
  }

  /** Actions that act on "the thing that triggered this" only make sense for event triggers on the
   * right kind of thing. */
  private static void validateCombination(TriggerType triggerType, Map<String, Object> t, ActionType actionType, Map<String, Object> a) {
    if (actionType == ActionType.LINK_ITEMS) {
      require(triggerType.isEvent() && "TASK".equals(string(t, "entityType")), "Linking to a goal works on a task trigger (when a task is created, completed or updated)");
    }
    if (actionType == ActionType.UPDATE_STATUS) {
      require(triggerType.isEvent(), "Updating a status needs an event trigger - there's no item to update otherwise");
      String entity = string(t, "entityType");
      String status = string(a, "status");
      if ("TASK".equals(entity)) require(TASK_STATUSES.contains(status), "Task status must be one of " + TASK_STATUSES);
      else if ("GOAL".equals(entity)) require(GOAL_STATUSES.contains(status), "Goal status must be one of " + GOAL_STATUSES);
      else throw new IllegalArgumentException("Only tasks and goals have a status you can update");
    }
  }

  private static void require(boolean condition, String message) {
    if (!condition) throw new IllegalArgumentException(message);
  }

  private static boolean text(Map<String, Object> m, String key) {
    return m.get(key) instanceof String s && !s.isBlank();
  }

  private static String string(Map<String, Object> m, String key) {
    Object v = m.get(key);
    return v == null ? null : String.valueOf(v);
  }

  static Double number(Map<String, Object> m, String key) {
    Object v = m.get(key);
    if (v instanceof Number n) return n.doubleValue();
    if (v instanceof String s) {
      try {
        return Double.parseDouble(s);
      } catch (NumberFormatException exception) {
        return null;
      }
    }
    return null;
  }

  private static boolean intIn(Map<String, Object> m, String key, int min, int max) {
    Double n = number(m, key);
    return n != null && n == Math.rint(n) && n >= min && n <= max;
  }

  private static void uuid(Map<String, Object> m, String key) {
    try {
      UUID.fromString(String.valueOf(m.get(key)));
    } catch (IllegalArgumentException exception) {
      throw new IllegalArgumentException(key + " must be a valid id");
    }
  }

  static List<String> sortedEntityTypes() {
    return ENTITY_TYPES.stream().sorted().toList();
  }
}
