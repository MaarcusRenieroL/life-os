package com.lifeos.finance_tracker.domains.record;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * The current pay cycle at a glance. A cycle starts the day salary lands, so spending after payday
 * is measured against the salary that pays for it rather than against a calendar month.
 *
 * @param suggestedPayCycleStartDay set only while the start day is still the default and a
 *     salary-sized credit has landed on another day - the UI offers to move the cycle there.
 */
public record FinanceOverview(
    LocalDate cycleStart,
    LocalDate cycleEnd,
    int payCycleStartDay,
    int daysLeft,
    BigDecimal incomeSoFar,
    BigDecimal expectedIncome,
    BigDecimal spentSoFar,
    BigDecimal upcomingBills,
    BigDecimal safeToSpend,
    BigDecimal safeToSpendPerDay,
    BigDecimal netWorth,
    Integer suggestedPayCycleStartDay) {

  /**
   * What is left to spend this cycle, and per remaining day. Expected income is the salary the user
   * has set (or, failing that, what has actually arrived); committed bills still to be charged this
   * cycle come off it. Never negative per day: overspending reads as "0 left", not a negative budget.
   */
  public static FinanceOverview compute(
      LocalDate today,
      LocalDate cycleStart,
      LocalDate cycleEnd,
      int payCycleStartDay,
      BigDecimal incomeSoFar,
      BigDecimal fixedMonthlyIncome,
      BigDecimal spentSoFar,
      BigDecimal upcomingBills,
      BigDecimal netWorth,
      Integer suggestedPayCycleStartDay) {
    int daysLeft = (int) Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(today, cycleEnd) + 1);
    BigDecimal expected = fixedMonthlyIncome != null && fixedMonthlyIncome.signum() > 0 ? fixedMonthlyIncome : incomeSoFar;
    BigDecimal safe = expected.subtract(spentSoFar).subtract(upcomingBills);
    BigDecimal perDay = safe.signum() <= 0 ? BigDecimal.ZERO : safe.divide(BigDecimal.valueOf(daysLeft), 2, java.math.RoundingMode.DOWN);
    return new FinanceOverview(
        cycleStart, cycleEnd, payCycleStartDay, daysLeft, incomeSoFar, expected, spentSoFar, upcomingBills, safe, perDay, netWorth,
        suggestedPayCycleStartDay);
  }
}
