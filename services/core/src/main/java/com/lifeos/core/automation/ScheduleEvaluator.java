package com.lifeos.core.automation;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;
import java.util.Optional;

/** When a scheduled rule is due. A rule is due if its most recent scheduled moment (at or before
 * now) is later than the last time it ran - so a job that was down at 18:00 still runs the missed
 * weekly review at 18:05 (once, not once per missed minute), and one that just ran isn't run
 * again. A monthly rule on the 31st runs on the last day of shorter months. */
public final class ScheduleEvaluator {

  private ScheduleEvaluator() {}

  /** The moment the rule should have most recently fired, at or before `now`. */
  public static Instant latestScheduled(Map<String, Object> config, ZonedDateTime now) {
    ZoneId zone = now.getZone();
    LocalTime time = LocalTime.parse(String.valueOf(config.get("time")));
    String frequency = String.valueOf(config.get("frequency"));

    ZonedDateTime candidate;
    switch (frequency) {
      case "DAILY" -> candidate = now.toLocalDate().atTime(time).atZone(zone);
      case "WEEKLY" -> {
        DayOfWeek day = DayOfWeek.of(((Number) numeric(config, "dayOfWeek")).intValue());
        candidate = now.toLocalDate().with(TemporalAdjusters.previousOrSame(day)).atTime(time).atZone(zone);
      }
      default -> {
        int dom = ((Number) numeric(config, "dayOfMonth")).intValue();
        candidate = monthlyOn(YearMonth.from(now), dom).atTime(time).atZone(zone);
      }
    }

    if (candidate.isAfter(now)) {
      candidate =
          switch (frequency) {
            case "DAILY" -> candidate.minusDays(1);
            case "WEEKLY" -> candidate.minusWeeks(1);
            default -> monthlyOn(YearMonth.from(now).minusMonths(1), ((Number) numeric(config, "dayOfMonth")).intValue()).atTime(time).atZone(zone);
          };
    }
    return candidate.toInstant();
  }

  /** The scheduled moment to record as this run, if the rule is due. */
  public static Optional<Instant> dueRun(Map<String, Object> config, Instant lastRunAt, ZonedDateTime now) {
    Instant scheduled = latestScheduled(config, now);
    if (lastRunAt != null && !lastRunAt.isBefore(scheduled)) return Optional.empty();
    return Optional.of(scheduled);
  }

  private static LocalDate monthlyOn(YearMonth month, int dayOfMonth) {
    return month.atDay(Math.min(dayOfMonth, month.lengthOfMonth()));
  }

  private static Number numeric(Map<String, Object> config, String key) {
    Object v = config.get(key);
    return v instanceof Number n ? n : Double.valueOf(String.valueOf(v));
  }
}
