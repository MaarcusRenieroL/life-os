package com.lifeos.finance_tracker.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

/**
 * A month measured from the day salary lands rather than from the 1st. With a start day of 25, "this
 * month" runs 25 Sep - 24 Oct, so spending after payday counts against the cycle that salary pays
 * for. A start day of {@link #LAST_WORKING_DAY} means salary lands on the last weekday of each month,
 * which moves around, so every cycle runs from one month's last working day to the day before the
 * next one's. Bank holidays are not known, only weekends. Everything is in IST: the app's accounts, alerts and statements are all Indian.
 */
public final class PayCycle {

  public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

  /** Stored in place of a day of the month: salary lands on the last Monday-Friday of the month. */
  public static final int LAST_WORKING_DAY = 0;

  private PayCycle() {}

  /** A cycle: {@code start} inclusive, {@code end} inclusive (the last instant before the next cycle). */
  public record Window(LocalDate firstDay, LocalDate lastDay, Instant start, Instant end) {
    /** Stable identifier of the cycle, e.g. "2026-09-25". */
    public String key() {
      return firstDay.toString();
    }
  }

  /** The cycle containing {@code at}, for a cycle that starts on {@code startDay} (1-28). */
  public static Window containing(Instant at, int startDay) {
    return containing(at.atZone(ZONE).toLocalDate(), startDay);
  }

  public static Window containing(LocalDate day, int startDay) {
    if (startDay == LAST_WORKING_DAY) {
      LocalDate thisMonth = lastWorkingDay(YearMonth.from(day));
      LocalDate first = day.isBefore(thisMonth) ? lastWorkingDay(YearMonth.from(day).minusMonths(1)) : thisMonth;
      LocalDate next = lastWorkingDay(YearMonth.from(first).plusMonths(1));
      return new Window(first, next.minusDays(1), first.atStartOfDay(ZONE).toInstant(), next.atStartOfDay(ZONE).toInstant().minusMillis(1));
    }
    int start = clamp(startDay);
    LocalDate first = day.getDayOfMonth() >= start ? day.withDayOfMonth(start) : day.minusMonths(1).withDayOfMonth(start);
    LocalDate next = first.plusMonths(1);
    return new Window(first, next.minusDays(1), first.atStartOfDay(ZONE).toInstant(), next.atStartOfDay(ZONE).toInstant().minusMillis(1));
  }

  /** The cycle before the one containing {@code at}. */
  public static Window before(Instant at, int startDay) {
    Window current = containing(at, startDay);
    return containing(current.firstDay().minusDays(1), startDay);
  }

  /** The last Monday-Friday of the month. */
  public static LocalDate lastWorkingDay(YearMonth month) {
    LocalDate day = month.atEndOfMonth();
    while (day.getDayOfWeek().getValue() >= 6) {
      day = day.minusDays(1);
    }
    return day;
  }

  /** 1-28, or {@link #LAST_WORKING_DAY}. */
  public static int clamp(int startDay) {
    return startDay == LAST_WORKING_DAY ? LAST_WORKING_DAY : Math.max(1, Math.min(28, startDay));
  }
}
