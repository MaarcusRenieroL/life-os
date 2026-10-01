package com.lifeos.core.automation;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** The pre-built rules a user can add with one click. Fixed in code - they're a starting point;
 * once applied a rule is the user's own and can be edited freely. */
public final class AutomationTemplates {

  private AutomationTemplates() {}

  public record Template(String key, String name, String description, TriggerType triggerType, Map<String, Object> triggerConfig, ActionType actionType, Map<String, Object> actionConfig) {}

  public static final List<Template> ALL =
      List.of(
          new Template(
              "job-follow-up",
              "Job follow-up",
              "When you mark an application as applied, add a task to follow up a week later.",
              TriggerType.ON_UPDATE,
              Map.of("entityType", "JOB_APPLICATION", "conditions", Map.of("status", "APPLIED")),
              ActionType.CREATE_TASK,
              Map.of("title", "Follow up: {{title}}", "priority", "MEDIUM", "dueInDays", 7)),
          new Template(
              "interview-prep",
              "Interview prep",
              "When an application moves to interviewing, add a prep task due in two days.",
              TriggerType.ON_UPDATE,
              Map.of("entityType", "JOB_APPLICATION", "conditions", Map.of("status", "INTERVIEWING")),
              ActionType.CREATE_TASK,
              Map.of("title", "Prepare for interview: {{title}}", "description", "Research the company, revisit the job description, prepare stories.", "priority", "HIGH", "dueInDays", 2)),
          new Template(
              "weekly-review",
              "Weekly review",
              "Every Sunday evening, get a summary of your week across tasks, habits, workouts and spending.",
              TriggerType.SCHEDULED,
              Map.of("frequency", "WEEKLY", "dayOfWeek", 7, "time", "18:00"),
              ActionType.GENERATE_REPORT,
              Map.of("period", "WEEK")),
          new Template(
              "monthly-review",
              "Monthly review",
              "On the first of each month, get a summary of the month that just ended.",
              TriggerType.SCHEDULED,
              Map.of("frequency", "MONTHLY", "dayOfMonth", 1, "time", "09:00"),
              ActionType.GENERATE_REPORT,
              Map.of("period", "MONTH")),
          new Template(
              "daily-planning",
              "Daily planning nudge",
              "Every morning, a reminder to plan your day.",
              TriggerType.SCHEDULED,
              Map.of("frequency", "DAILY", "time", "08:30"),
              ActionType.SEND_NOTIFICATION,
              Map.of("title", "Plan your day", "body", "Pick your top three tasks and check your calendar.")),
          new Template(
              "goal-alert",
              "Goal alert",
              "Get notified when any goal's progress drops below 25%.",
              TriggerType.THRESHOLD,
              Map.of("metric", "GOAL_PROGRESS_BELOW", "value", 25),
              ActionType.SEND_NOTIFICATION,
              Map.of("title", "A goal needs attention", "body", "Some goals are falling behind - open Goals to see which.")),
          new Template(
              "habit-streak-warning",
              "Habit streak warning",
              "Get warned when your habit consistency over the last two weeks falls under 50%.",
              TriggerType.THRESHOLD,
              Map.of("metric", "HABIT_CONSISTENCY_BELOW", "value", 50),
              ActionType.SEND_NOTIFICATION,
              Map.of("title", "Your habits are slipping", "body", "Consistency has dropped - pick one habit to get back on today.")),
          new Template(
              "overdue-pile-up",
              "Overdue pile-up",
              "Get notified when more than 5 tasks are overdue.",
              TriggerType.THRESHOLD,
              Map.of("metric", "OVERDUE_TASKS_ABOVE", "value", 5),
              ActionType.SEND_NOTIFICATION,
              Map.of("title", "Overdue tasks are piling up", "body", "Reschedule or close a few to get back on top of things.")),
          new Template(
              "goal-completed-reflection",
              "Reflect on finished goals",
              "When you complete a goal, add a task to write down what you learned.",
              TriggerType.ON_COMPLETE,
              Map.of("entityType", "GOAL"),
              ActionType.CREATE_TASK,
              Map.of("title", "Reflect on finishing: {{title}}", "priority", "LOW", "dueInDays", 3)),
          new Template(
              "urgent-done-celebration",
              "Celebrate urgent wins",
              "A little acknowledgement when you finish an urgent task.",
              TriggerType.ON_COMPLETE,
              Map.of("entityType", "TASK", "conditions", Map.of("priority", "URGENT")),
              ActionType.SEND_NOTIFICATION,
              Map.of("title", "Urgent one down: {{title}}", "body", "Nice work clearing that.")));

  public static Optional<Template> find(String key) {
    return ALL.stream().filter(t -> t.key().equals(key)).findFirst();
  }
}
