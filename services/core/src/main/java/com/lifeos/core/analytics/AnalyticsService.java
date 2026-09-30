package com.lifeos.core.analytics;

import com.lifeos.core.analytics.AnalyticsModels.Anomaly;
import com.lifeos.core.analytics.AnalyticsModels.DailySnapshot;
import com.lifeos.core.analytics.AnalyticsModels.Dashboard;
import com.lifeos.core.analytics.AnalyticsModels.Insight;
import com.lifeos.core.analytics.AnalyticsModels.PeriodSummary;
import com.lifeos.core.analytics.AnalyticsModels.TrendPoint;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Cross-module analytics: fetches what each module reports, then hands it to the pure
 * calculators. "Today" and "this week" follow the configured analytics zone, not the server's. */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

  static final int MAX_TREND_DAYS = 365;

  private final ModuleDataClient client;

  public LocalDate today() {
    return LocalDate.now(ZoneId.of(client.zone()));
  }

  public Dashboard dashboard(UUID userId) {
    LocalDate today = today();
    ModuleData.Bundle todayBundle = client.fetch(userId, today, today);
    PeriodSummary week = summary(userId, "WEEK", today);
    return new Dashboard(AnalyticsCalculator.daily(todayBundle, today), week, anomalies(userId), insights(userId, 60), week.unavailableModules());
  }

  public DailySnapshot daily(UUID userId, LocalDate date) {
    LocalDate day = date == null ? today() : date;
    return AnalyticsCalculator.daily(client.fetch(userId, day, day), day);
  }

  /** A Monday-start week or calendar month containing `asOf`, compared with the period before it. */
  public PeriodSummary summary(UUID userId, String period, LocalDate asOf) {
    LocalDate anchor = asOf == null ? today() : asOf;
    boolean weekly = !"MONTH".equalsIgnoreCase(period);
    LocalDate from = weekly ? AnalyticsCalculator.weekStart(anchor) : anchor.withDayOfMonth(1);
    LocalDate to = weekly ? from.plusDays(6) : from.plusMonths(1).minusDays(1);
    LocalDate prevFrom = weekly ? from.minusWeeks(1) : from.minusMonths(1);
    LocalDate prevTo = from.minusDays(1);

    ModuleData.Bundle current = client.fetch(userId, from, to);
    ModuleData.Bundle previous = client.fetch(userId, prevFrom, prevTo);
    return AnalyticsCalculator.summary(weekly ? "WEEK" : "MONTH", from, to, current, previous);
  }

  public List<TrendPoint> trends(UUID userId, int days, boolean weekly) {
    int window = Math.max(7, Math.min(days, MAX_TREND_DAYS));
    LocalDate to = today();
    LocalDate from = to.minusDays(window - 1L);
    List<TrendPoint> daily = AnalyticsCalculator.trend(client.fetch(userId, from, to), from, to);
    return weekly ? AnalyticsCalculator.weekly(daily) : daily;
  }

  public List<Anomaly> anomalies(UUID userId) {
    LocalDate today = today();
    LocalDate baselineFrom = today.minusDays(40);

    ModuleData.Bundle habitsAndTasks = client.fetch(userId, today.minusDays(13), today);
    ModuleData.SpendStats spend = client.spending(userId, baselineFrom, today);
    ModuleData.SpendStats recentCategories = client.spending(userId, today.minusDays(6), today);
    ModuleData.SpendStats baselineCategories = client.spending(userId, today.minusDays(34), today.minusDays(7));

    return AnomalyDetector.detect(
        spend == null ? null : spend.days(),
        recentCategories == null ? null : recentCategories.categories(),
        baselineCategories == null ? null : weeklyAverage(baselineCategories.categories()),
        habitsAndTasks.habits() == null ? null : habitsAndTasks.habits().habits(),
        habitsAndTasks.goals(),
        habitsAndTasks.tasks() == null ? null : habitsAndTasks.tasks().overdueOpen(),
        today);
  }

  public List<Insight> insights(UUID userId, int days) {
    int window = Math.max(14, Math.min(days, 180));
    LocalDate to = today();
    LocalDate from = to.minusDays(window - 1L);
    return InsightFinder.find(AnalyticsCalculator.insightDays(client.fetch(userId, from, to), from, to));
  }

  /** The baseline window is four weeks, so a category's weekly average is its total over four. */
  private static List<ModuleData.CategorySpend> weeklyAverage(List<ModuleData.CategorySpend> fourWeekTotals) {
    return fourWeekTotals.stream().map(c -> new ModuleData.CategorySpend(c.category(), c.amount().divide(BigDecimal.valueOf(4), 2, RoundingMode.HALF_UP))).toList();
  }
}
