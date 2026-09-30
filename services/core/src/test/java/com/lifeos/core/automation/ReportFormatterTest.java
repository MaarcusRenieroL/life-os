package com.lifeos.core.automation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.core.analytics.AnalyticsModels.GoalBreakdown;
import com.lifeos.core.analytics.AnalyticsModels.PeriodSummary;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ReportFormatterTest {

  private PeriodSummary summary(String period, int tasks, int prevTasks, BigDecimal spend, BigDecimal prevSpend, List<String> unavailable) {
    return new PeriodSummary(period, LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 4), tasks, 10, 60, 75, 3.5, 2, 90, spend, BigDecimal.ZERO, prevSpend, prevTasks, 4, 1, 1, 3, 4.2, 3.8, 2, new BigDecimal("-0.6"), List.of(), List.of(), new GoalBreakdown(null, null, null, null, null, 0), unavailable);
  }

  @Test
  void titleNamesThePeriod() {
    assertThat(ReportFormatter.title(summary("WEEK", 1, 1, BigDecimal.ONE, null, List.of()))).isEqualTo("Weekly review: 2026-09-28 to 2026-10-04");
    assertThat(ReportFormatter.title(summary("MONTH", 1, 1, BigDecimal.ONE, null, List.of()))).startsWith("Monthly review");
  }

  @Test
  void bodyCoversEachModuleAndComparesWithTheLastPeriod() {
    String body = ReportFormatter.body(summary("WEEK", 8, 5, new BigDecimal("1200"), new BigDecimal("1000"), List.of()));

    assertThat(body).contains("Tasks: 8 done (60% of those due), up 3 on last time");
    assertThat(body).contains("Habits: 75% consistency").contains("Focus: 3.5 h").contains("Workouts: 2 (90 min)");
    assertThat(body).contains("Spending: 1200, up 200 on last time");
    assertThat(body).contains("Job search: 4 applied, 1 interviews").contains("Journal: 3 entries, average mood 4.2/5").contains("Milestones hit: 2").contains("Weight: -0.6 kg");
  }

  @Test
  void aQuietPeriodOmitsSectionsWithNothingToSayAndFlagsMissingModules() {
    PeriodSummary quiet =
        new PeriodSummary("WEEK", LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 4), 0, 0, null, null, 0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, null, 0, 0, 0, 0, 0, null, null, 0, null, List.of(), List.of(), new GoalBreakdown(null, null, null, null, null, 0), List.of("habits"));

    String body = ReportFormatter.body(quiet);

    assertThat(body).contains("Tasks: 0 done").doesNotContain("Habits:").doesNotContain("Workouts:").doesNotContain("Journal:").doesNotContain("Weight:");
    assertThat(body).contains("(No data from: habits)");
  }
}
