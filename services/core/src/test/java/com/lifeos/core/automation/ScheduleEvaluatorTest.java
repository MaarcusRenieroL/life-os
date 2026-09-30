package com.lifeos.core.automation;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ScheduleEvaluatorTest {

  private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

  private ZonedDateTime at(String iso) {
    return ZonedDateTime.parse(iso + "+05:30[Asia/Kolkata]");
  }

  private Instant instant(String iso) {
    return at(iso).toInstant();
  }

  private final Map<String, Object> daily = Map.of("frequency", "DAILY", "time", "08:30");
  private final Map<String, Object> weeklySunday = Map.of("frequency", "WEEKLY", "dayOfWeek", 7, "time", "18:00");
  private final Map<String, Object> monthly31 = Map.of("frequency", "MONTHLY", "dayOfMonth", 31, "time", "09:00");

  @Test
  void dailyLatestScheduledIsTodayOnceThePassedTimeAndYesterdayBefore() {
    assertThat(ScheduleEvaluator.latestScheduled(daily, at("2026-09-30T09:00:00"))).isEqualTo(instant("2026-09-30T08:30:00"));
    assertThat(ScheduleEvaluator.latestScheduled(daily, at("2026-09-30T08:00:00"))).isEqualTo(instant("2026-09-29T08:30:00"));
  }

  @Test
  void aDailyRuleIsDueOnceAfterItsTimeThenQuietUntilTomorrow() {
    Instant lastRun = instant("2026-09-29T08:30:20");

    assertThat(ScheduleEvaluator.dueRun(daily, lastRun, at("2026-09-30T08:29:00"))).isEmpty();
    assertThat(ScheduleEvaluator.dueRun(daily, lastRun, at("2026-09-30T08:30:00"))).isPresent();

    Instant justRan = instant("2026-09-30T08:30:05");
    assertThat(ScheduleEvaluator.dueRun(daily, justRan, at("2026-09-30T08:31:00"))).isEmpty();
    assertThat(ScheduleEvaluator.dueRun(daily, justRan, at("2026-10-01T08:30:00"))).isPresent();
  }

  @Test
  void aMissedRunIsCaughtUpOnceNotOncePerMissedMinute() {
    Instant lastRun = instant("2026-09-29T08:30:05");

    // Service was down over 08:30; it comes back at 11:07.
    assertThat(ScheduleEvaluator.dueRun(daily, lastRun, at("2026-09-30T11:07:00"))).isPresent();
    Instant caughtUp = instant("2026-09-30T11:07:01");
    assertThat(ScheduleEvaluator.dueRun(daily, caughtUp, at("2026-09-30T11:08:00"))).isEmpty();
  }

  @Test
  void weeklyLatestScheduledIsTheMostRecentChosenWeekday() {
    // 2026-09-30 is a Wednesday; the last Sunday was the 27th.
    assertThat(ScheduleEvaluator.latestScheduled(weeklySunday, at("2026-09-30T12:00:00"))).isEqualTo(instant("2026-09-27T18:00:00"));
    // On Sunday itself: before 18:00 it's still last week's, after it's today's.
    assertThat(ScheduleEvaluator.latestScheduled(weeklySunday, at("2026-10-04T17:59:00"))).isEqualTo(instant("2026-09-27T18:00:00"));
    assertThat(ScheduleEvaluator.latestScheduled(weeklySunday, at("2026-10-04T18:00:00"))).isEqualTo(instant("2026-10-04T18:00:00"));
  }

  @Test
  void aNewlyCreatedWeeklyRuleDoesNotFireForAnEarlierSunday() {
    // Created Wednesday evening: lastRunAt = creation time, so last Sunday's slot is already behind it.
    Instant created = instant("2026-09-30T20:00:00");

    assertThat(ScheduleEvaluator.dueRun(weeklySunday, created, at("2026-09-30T20:01:00"))).isEmpty();
    assertThat(ScheduleEvaluator.dueRun(weeklySunday, created, at("2026-10-04T18:00:00"))).isPresent();
  }

  @Test
  void monthlyOnThe31stFallsBackToTheLastDayOfShorterMonths() {
    // September has 30 days.
    assertThat(ScheduleEvaluator.latestScheduled(monthly31, at("2026-09-30T10:00:00"))).isEqualTo(instant("2026-09-30T09:00:00"));
    // Early October: the latest scheduled moment is still September's.
    assertThat(ScheduleEvaluator.latestScheduled(monthly31, at("2026-10-05T10:00:00"))).isEqualTo(instant("2026-09-30T09:00:00"));
    assertThat(ScheduleEvaluator.latestScheduled(monthly31, at("2026-10-31T09:30:00"))).isEqualTo(instant("2026-10-31T09:00:00"));
  }

  @Test
  void monthlyRolloverAcrossTheYearBoundary() {
    Map<String, Object> first = Map.of("frequency", "MONTHLY", "dayOfMonth", 15, "time", "09:00");

    assertThat(ScheduleEvaluator.latestScheduled(first, at("2027-01-10T10:00:00"))).isEqualTo(instant("2026-12-15T09:00:00"));
  }

  @Test
  void aRuleThatNeverRanIsDueAtItsFirstScheduledMoment() {
    assertThat(ScheduleEvaluator.dueRun(daily, null, at("2026-09-30T09:00:00"))).isPresent();
  }
}
