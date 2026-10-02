package com.lifeos.core.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.core.analytics.AnalyticsModels.Anomaly;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AnomalyDetectorTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);

  /** `total` consecutive days ending today, each spending `usual` except the given last-N values. */
  private List<ModuleData.SpendDay> spendDays(int total, double usual, double... lastDays) {
    List<ModuleData.SpendDay> days = new ArrayList<>();
    for (int i = 0; i < total; i++) {
      double spend = usual + (i % 3) * 20; // a little natural variation so the baseline has a spread
      int fromEnd = total - 1 - i;
      if (fromEnd < lastDays.length) spend = lastDays[lastDays.length - 1 - fromEnd];
      days.add(new ModuleData.SpendDay(TODAY.minusDays(fromEnd), BigDecimal.valueOf(spend), BigDecimal.ZERO));
    }
    return days;
  }

  @Test
  void aDayFarAboveTheBaselineIsFlagged() {
    List<Anomaly> found = AnomalyDetector.spendingSpikes(spendDays(37, 400, 400, 410, 5000));

    assertThat(found).hasSize(1);
    assertThat(found.get(0).type()).isEqualTo("SPENDING_SPIKE");
    assertThat(found.get(0).title()).contains(TODAY.toString());
  }

  @Test
  void ordinaryVariationIsNotFlagged() {
    assertThat(AnomalyDetector.spendingSpikes(spendDays(37, 400, 380, 440, 460))).isEmpty();
  }

  @Test
  void tooLittleHistoryMeansNoSpikeVerdict() {
    assertThat(AnomalyDetector.spendingSpikes(spendDays(15, 400, 5000))).isEmpty();
  }

  @Test
  void aTinyAbsoluteAmountOnAFlatBaselineIsNotASpike() {
    // Baseline is ~0, so a 30 rupee day is "infinite sigmas" but not worth a warning.
    List<ModuleData.SpendDay> days = new ArrayList<>();
    for (int i = 0; i < 37; i++) days.add(new ModuleData.SpendDay(TODAY.minusDays(36 - i), i == 36 ? BigDecimal.valueOf(0.5) : BigDecimal.ZERO, BigDecimal.ZERO));

    assertThat(AnomalyDetector.spendingSpikes(days)).isEmpty();
  }

  @Test
  void aCategoryAtLeastDoubleItsUsualWeeklyAmountIsFlagged() {
    var recent = List.of(new ModuleData.CategorySpend("Dining", BigDecimal.valueOf(3000)), new ModuleData.CategorySpend("Fuel", BigDecimal.valueOf(1000)));
    var baseline = List.of(new ModuleData.CategorySpend("Dining", BigDecimal.valueOf(1000)), new ModuleData.CategorySpend("Fuel", BigDecimal.valueOf(900)));

    List<Anomaly> found = AnomalyDetector.categorySpikes(recent, baseline);

    assertThat(found).extracting(Anomaly::title).containsExactly("Dining spending is up");
  }

  @Test
  void aBrandNewCategoryOrAPettyAmountIsNotFlagged() {
    var recent = List.of(new ModuleData.CategorySpend("Gifts", BigDecimal.valueOf(5000)), new ModuleData.CategorySpend("Tea", BigDecimal.valueOf(300)));
    var baseline = List.of(new ModuleData.CategorySpend("Tea", BigDecimal.valueOf(50)));

    assertThat(AnomalyDetector.categorySpikes(recent, baseline)).isEmpty();
  }

  private ModuleData.HabitStat habit(String name, int scheduled, int completed, int idle) {
    return new ModuleData.HabitStat(UUID.randomUUID(), name, scheduled, completed, idle);
  }

  @Test
  void aHabitNotDoneForAWhileIsFlaggedWithEscalatingSeverity() {
    List<Anomaly> found =
        AnomalyDetector.quietHabits(List.of(habit("Read", 14, 10, 3), habit("Run", 14, 4, 9), habit("Journal", 14, 14, 0), habit("Yoga", 14, 0, -1)));

    assertThat(found).extracting(Anomaly::title).containsExactly("Read has gone quiet", "Run has gone quiet", "Yoga has gone quiet");
    assertThat(found.get(0).severity()).isEqualTo("WARN");
    assertThat(found.get(1).severity()).isEqualTo("ALERT");
    assertThat(found.get(2).detail()).contains("Not done at all");
  }

  @Test
  void aBrandNewHabitWithFewScheduledDaysIsLeftAlone() {
    assertThat(AnomalyDetector.quietHabits(List.of(habit("New", 2, 0, -1)))).isEmpty();
  }

  private ModuleData.GoalSummary goal(String name, String status, LocalDate target, Integer pct) {
    return new ModuleData.GoalSummary(UUID.randomUUID(), name, status, 2, target, new ModuleData.GoalProgress(pct, null, null, null, null, null, null));
  }

  @Test
  void onlyUnfinishedGoalsPastTheirTargetDateAreOverdue() {
    List<Anomaly> found =
        AnomalyDetector.overdueGoals(
            List.of(
                goal("Late", "AT_RISK", TODAY.minusDays(3), 40),
                goal("Done", "COMPLETED", TODAY.minusDays(3), 100),
                goal("Paused", "PAUSED", TODAY.minusDays(3), 10),
                goal("Future", "ON_TRACK", TODAY.plusDays(3), 10),
                goal("No date", "ACTIVE", null, 10),
                goal("Due today", "ACTIVE", TODAY, 10)),
            TODAY);

    assertThat(found).hasSize(1);
    assertThat(found.get(0).title()).isEqualTo("Late is past its target date");
    assertThat(found.get(0).detail()).contains("40% done");
  }

  @Test
  void manyOverdueTasksRaiseOneAlertAndFewDoNot() {
    assertThat(AnomalyDetector.detect(null, null, null, null, null, 5, TODAY)).extracting(Anomaly::type).containsExactly("OVERDUE_TASKS");
    assertThat(AnomalyDetector.detect(null, null, null, null, null, 4, TODAY)).isEmpty();
  }

  @Test
  void missingModulesJustContributeNothing() {
    assertThat(AnomalyDetector.detect(null, null, null, null, null, null, TODAY)).isEmpty();
  }

  @Test
  void aBaselineWithAlmostNoSpendingGivesNoSpikes() {
    // 30 empty days, then a normal week of spending: nothing to compare against, so nothing is "unusual".
    List<ModuleData.SpendDay> days = new ArrayList<>();
    for (int i = 0; i < 37; i++) days.add(new ModuleData.SpendDay(TODAY.minusDays(36 - i), i >= 30 ? BigDecimal.valueOf(4000) : BigDecimal.ZERO, BigDecimal.ZERO));
    assertThat(AnomalyDetector.spendingSpikes(days)).isEmpty();
  }
}
