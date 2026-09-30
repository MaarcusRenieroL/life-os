package com.lifeos.core.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.core.analytics.AnalyticsModels.Insight;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class InsightFinderTest {

  private InsightFinder.Day day(Double mood, Double energy, Double tasks, Double focus, Double habit, Double workout) {
    return new InsightFinder.Day(mood, energy, tasks, focus, habit, workout);
  }

  @Test
  void aClearPositiveRelationshipIsReportedInPlainLanguage() {
    List<InsightFinder.Day> days = new ArrayList<>();
    for (int i = 0; i < 14; i++) days.add(day(null, 1.0 + i % 5, null, 20.0 * (1 + i % 5) + (i % 2), null, null));

    List<Insight> insights = InsightFinder.find(days);

    assertThat(insights).hasSize(1);
    assertThat(insights.get(0).title()).isEqualTo("Energy and focus time");
    assertThat(insights.get(0).correlation()).isGreaterThan(0.9);
    assertThat(insights.get(0).sampleSize()).isEqualTo(14);
    assertThat(insights.get(0).detail()).contains("Higher energy").contains("more focus time").contains("not proof of cause");
  }

  @Test
  void aNegativeRelationshipDescribesTheOppositeDirection() {
    List<InsightFinder.Day> days = new ArrayList<>();
    for (int i = 0; i < 14; i++) days.add(day(null, 1.0 + i % 5, null, 100.0 - 15.0 * (i % 5), null, null));

    Insight insight = InsightFinder.find(days).get(0);

    assertThat(insight.correlation()).isLessThan(-0.9);
    assertThat(insight.detail()).contains("Higher energy").contains("less focus time");
  }

  @Test
  void tooFewOverlappingDaysProduceNothing() {
    List<InsightFinder.Day> days = new ArrayList<>();
    for (int i = 0; i < 9; i++) days.add(day(null, 1.0 + i % 5, null, 20.0 * (1 + i % 5), null, null));

    assertThat(InsightFinder.find(days)).isEmpty();
  }

  @Test
  void daysWithAMissingSideAreSkippedNotCountedAsZero() {
    List<InsightFinder.Day> days = new ArrayList<>();
    for (int i = 0; i < 20; i++) {
      // Only every other day has both numbers - 10 usable pairs, none of them zero-filled.
      days.add(i % 2 == 0 ? day(null, 1.0 + (i / 2) % 5, null, 20.0 * (1 + (i / 2) % 5), null, null) : day(null, null, null, 0.0, null, null));
    }

    List<Insight> insights = InsightFinder.find(days);

    assertThat(insights).hasSize(1);
    assertThat(insights.get(0).sampleSize()).isEqualTo(10);
  }

  @Test
  void weakOrUnrelatedSeriesAreNotReported() {
    List<InsightFinder.Day> days = new ArrayList<>();
    double[] tasks = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8};
    double[] mood = {3, 3, 4, 4, 3, 3, 4, 4, 3, 3, 4, 4}; // r = 0.0 against the tasks above
    for (int i = 0; i < tasks.length; i++) days.add(day(mood[i], null, tasks[i], null, null, null));

    assertThat(InsightFinder.find(days)).isEmpty();
  }

  @Test
  void strongestRelationshipComesFirst() {
    List<InsightFinder.Day> days = new ArrayList<>();
    for (int i = 0; i < 20; i++) {
      double e = 1.0 + i % 5;
      // energy~focus is exact; mood~tasks is noisier.
      days.add(day(3.0 + (i % 4 == 0 ? 1 : 0), e, 5.0 + (i % 4 == 0 ? 3 : (i % 3)), 10 * e, null, null));
    }

    List<Insight> insights = InsightFinder.find(days);

    assertThat(insights.get(0).title()).isEqualTo("Energy and focus time");
    if (insights.size() > 1) assertThat(Math.abs(insights.get(0).correlation())).isGreaterThanOrEqualTo(Math.abs(insights.get(1).correlation()));
  }
}
