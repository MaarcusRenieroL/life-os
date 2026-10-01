package com.lifeos.core.automation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RuleValidatorTest {

  private static final Map<String, Object> TASK_CREATED = Map.of("entityType", "TASK");
  private static final Map<String, Object> NOTIFY = Map.of("title", "Hi");

  private void invalid(TriggerType t, Map<String, Object> tc, ActionType a, Map<String, Object> ac, String fragment) {
    assertThatThrownBy(() -> RuleValidator.validate(t, tc, a, ac)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining(fragment);
  }

  @Test
  void everyBuiltInTemplateIsAValidRule() {
    for (AutomationTemplates.Template template : AutomationTemplates.ALL) {
      assertThatCode(() -> RuleValidator.validate(template.triggerType(), template.triggerConfig(), template.actionType(), template.actionConfig())).as(template.key()).doesNotThrowAnyException();
    }
    assertThat(AutomationTemplates.ALL.stream().map(AutomationTemplates.Template::key).distinct()).hasSameSizeAs(AutomationTemplates.ALL);
  }

  @Test
  void eventTriggersNeedAKnownEntityType() {
    invalid(TriggerType.ON_CREATE, Map.of(), ActionType.SEND_NOTIFICATION, NOTIFY, "entityType");
    invalid(TriggerType.ON_CREATE, Map.of("entityType", "BANANA"), ActionType.SEND_NOTIFICATION, NOTIFY, "entityType");
    assertThatCode(() -> RuleValidator.validate(TriggerType.ON_CREATE, TASK_CREATED, ActionType.SEND_NOTIFICATION, NOTIFY)).doesNotThrowAnyException();
  }

  @Test
  void jobApplicationsCantBeCompleted() {
    invalid(TriggerType.ON_COMPLETE, Map.of("entityType", "JOB_APPLICATION"), ActionType.SEND_NOTIFICATION, NOTIFY, "completed");
  }

  @Test
  void scheduleNeedsAValidTimeAndTheRightDayField() {
    invalid(TriggerType.SCHEDULED, Map.of("frequency", "DAILY", "time", "25:99"), ActionType.SEND_NOTIFICATION, NOTIFY, "time");
    invalid(TriggerType.SCHEDULED, Map.of("frequency", "DAILY"), ActionType.SEND_NOTIFICATION, NOTIFY, "time");
    invalid(TriggerType.SCHEDULED, Map.of("frequency", "WEEKLY", "time", "09:00"), ActionType.SEND_NOTIFICATION, NOTIFY, "dayOfWeek");
    invalid(TriggerType.SCHEDULED, Map.of("frequency", "WEEKLY", "time", "09:00", "dayOfWeek", 8), ActionType.SEND_NOTIFICATION, NOTIFY, "dayOfWeek");
    invalid(TriggerType.SCHEDULED, Map.of("frequency", "MONTHLY", "time", "09:00"), ActionType.SEND_NOTIFICATION, NOTIFY, "dayOfMonth");
    invalid(TriggerType.SCHEDULED, Map.of("frequency", "HOURLY", "time", "09:00"), ActionType.SEND_NOTIFICATION, NOTIFY, "frequency");
  }

  @Test
  void thresholdNeedsAKnownMetricAndASaneValue() {
    invalid(TriggerType.THRESHOLD, Map.of("metric", "MOON_PHASE", "value", 1), ActionType.SEND_NOTIFICATION, NOTIFY, "metric");
    invalid(TriggerType.THRESHOLD, Map.of("metric", "GOAL_PROGRESS_BELOW"), ActionType.SEND_NOTIFICATION, NOTIFY, "value");
    invalid(TriggerType.THRESHOLD, Map.of("metric", "GOAL_PROGRESS_BELOW", "value", 150), ActionType.SEND_NOTIFICATION, NOTIFY, "100");
    invalid(TriggerType.THRESHOLD, Map.of("metric", "GOAL_PROGRESS_BELOW", "value", 20, "goalId", "nope"), ActionType.SEND_NOTIFICATION, NOTIFY, "goalId");
    assertThatCode(() -> RuleValidator.validate(TriggerType.THRESHOLD, Map.of("metric", "WEEKLY_SPEND_ABOVE", "value", 15000), ActionType.SEND_NOTIFICATION, NOTIFY)).doesNotThrowAnyException();
  }

  @Test
  void actionsNeedTheirRequiredFields() {
    invalid(TriggerType.ON_CREATE, TASK_CREATED, ActionType.CREATE_TASK, Map.of(), "title");
    invalid(TriggerType.ON_CREATE, TASK_CREATED, ActionType.CREATE_TASK, Map.of("title", "x", "priority", "PANIC"), "priority");
    invalid(TriggerType.ON_CREATE, TASK_CREATED, ActionType.CREATE_TASK, Map.of("title", "x", "dueInDays", 9999), "dueInDays");
    invalid(TriggerType.ON_CREATE, TASK_CREATED, ActionType.CREATE_EVENT, Map.of("title", "x", "hour", 30), "hour");
    invalid(TriggerType.ON_CREATE, TASK_CREATED, ActionType.CREATE_EVENT, Map.of("title", "x", "category", "PARTY"), "category");
    invalid(TriggerType.ON_CREATE, TASK_CREATED, ActionType.SEND_NOTIFICATION, Map.of("title", " "), "title");
    invalid(TriggerType.ON_CREATE, TASK_CREATED, ActionType.GENERATE_REPORT, Map.of("period", "DECADE"), "period");
  }

  @Test
  void linkingToAGoalNeedsATaskTriggerAndAValidGoalId() {
    Map<String, Object> link = Map.of("goalId", UUID.randomUUID().toString());
    assertThatCode(() -> RuleValidator.validate(TriggerType.ON_CREATE, TASK_CREATED, ActionType.LINK_ITEMS, link)).doesNotThrowAnyException();
    invalid(TriggerType.ON_CREATE, Map.of("entityType", "GOAL"), ActionType.LINK_ITEMS, link, "task");
    invalid(TriggerType.SCHEDULED, Map.of("frequency", "DAILY", "time", "09:00"), ActionType.LINK_ITEMS, link, "task trigger");
  }

  @Test
  void updatingAStatusNeedsAnEventTriggerAndAStatusValidForThatEntity() {
    assertThatCode(() -> RuleValidator.validate(TriggerType.ON_CREATE, TASK_CREATED, ActionType.UPDATE_STATUS, Map.of("status", "IN_PROGRESS"))).doesNotThrowAnyException();
    invalid(TriggerType.ON_CREATE, TASK_CREATED, ActionType.UPDATE_STATUS, Map.of("status", "PAUSED"), "Task status");
    assertThatCode(() -> RuleValidator.validate(TriggerType.ON_UPDATE, Map.of("entityType", "GOAL"), ActionType.UPDATE_STATUS, Map.of("status", "PAUSED"))).doesNotThrowAnyException();
    invalid(TriggerType.ON_UPDATE, Map.of("entityType", "GOAL"), ActionType.UPDATE_STATUS, Map.of("status", "AT_RISK"), "Goal status");
    invalid(TriggerType.ON_UPDATE, Map.of("entityType", "HABIT"), ActionType.UPDATE_STATUS, Map.of("status", "DONE"), "status");
    invalid(TriggerType.SCHEDULED, Map.of("frequency", "DAILY", "time", "09:00"), ActionType.UPDATE_STATUS, Map.of("status", "DONE"), "event trigger");
  }

  @Test
  void missingTriggerOrActionIsRejected() {
    invalid(null, Map.of(), ActionType.SEND_NOTIFICATION, NOTIFY, "trigger");
    invalid(TriggerType.ON_CREATE, TASK_CREATED, null, Map.of(), "action");
  }
}
