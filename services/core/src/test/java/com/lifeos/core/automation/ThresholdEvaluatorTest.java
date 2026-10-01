package com.lifeos.core.automation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.core.analytics.ModuleData;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ThresholdEvaluatorTest {

  private ModuleData.GoalSummary goal(UUID id, String name, String status, Integer pct) {
    return new ModuleData.GoalSummary(id, name, status, 2, null, new ModuleData.GoalProgress(pct, null, null, null, null, null, null));
  }

  private ThresholdEvaluator.Data data(List<ModuleData.GoalSummary> goals, Integer habit, BigDecimal spend, Integer overdue) {
    return new ThresholdEvaluator.Data(goals, habit, spend, overdue);
  }

  @Test
  void goalsBelowTheLineAreListedByName() {
    var result = ThresholdEvaluator.evaluate(Map.of("metric", "GOAL_PROGRESS_BELOW", "value", 25), data(List.of(goal(UUID.randomUUID(), "Run 10k", "AT_RISK", 10), goal(UUID.randomUUID(), "Read", "ACTIVE", 60), goal(UUID.randomUUID(), "Save", "ON_TRACK", 24)), null, null, null));

    assertThat(result.met()).isTrue();
    assertThat(result.message()).contains("Run 10k (10%)").contains("Save (24%)").doesNotContain("Read").contains("are below 25%");
  }

  @Test
  void finishedPausedAndArchivedGoalsNeverTrigger() {
    var goals = List.of(goal(UUID.randomUUID(), "A", "COMPLETED", 0), goal(UUID.randomUUID(), "B", "PAUSED", 0), goal(UUID.randomUUID(), "C", "ARCHIVED", 0));

    assertThat(ThresholdEvaluator.evaluate(Map.of("metric", "GOAL_PROGRESS_BELOW", "value", 50), data(goals, null, null, null)).met()).isFalse();
  }

  @Test
  void aSpecificGoalCanBeWatchedAlone() {
    UUID watched = UUID.randomUUID();
    var goals = List.of(goal(watched, "Watched", "ACTIVE", 80), goal(UUID.randomUUID(), "Other", "ACTIVE", 5));

    assertThat(ThresholdEvaluator.evaluate(Map.of("metric", "GOAL_PROGRESS_BELOW", "value", 50, "goalId", watched.toString()), data(goals, null, null, null)).met()).isFalse();
  }

  @Test
  void habitConsistencySpendAndOverdueCompareAgainstTheirValues() {
    assertThat(ThresholdEvaluator.evaluate(Map.of("metric", "HABIT_CONSISTENCY_BELOW", "value", 50), data(null, 40, null, null)).met()).isTrue();
    assertThat(ThresholdEvaluator.evaluate(Map.of("metric", "HABIT_CONSISTENCY_BELOW", "value", 50), data(null, 50, null, null)).met()).isFalse();
    assertThat(ThresholdEvaluator.evaluate(Map.of("metric", "WEEKLY_SPEND_ABOVE", "value", 5000), data(null, null, new BigDecimal("5000.01"), null)).met()).isTrue();
    assertThat(ThresholdEvaluator.evaluate(Map.of("metric", "WEEKLY_SPEND_ABOVE", "value", 5000), data(null, null, new BigDecimal("5000"), null)).met()).isFalse();
    assertThat(ThresholdEvaluator.evaluate(Map.of("metric", "OVERDUE_TASKS_ABOVE", "value", 5), data(null, null, null, 6)).met()).isTrue();
    assertThat(ThresholdEvaluator.evaluate(Map.of("metric", "OVERDUE_TASKS_ABOVE", "value", 5), data(null, null, null, 5)).met()).isFalse();
  }

  @Test
  void aModuleThatDidntAnswerNeverCountsAsMet() {
    for (String metric : List.of("GOAL_PROGRESS_BELOW", "HABIT_CONSISTENCY_BELOW", "WEEKLY_SPEND_ABOVE", "OVERDUE_TASKS_ABOVE")) {
      assertThat(ThresholdEvaluator.evaluate(Map.of("metric", metric, "value", 50), data(null, null, null, null)).met()).as(metric).isFalse();
    }
  }
}
