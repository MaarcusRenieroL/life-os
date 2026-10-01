package com.lifeos.finance_tracker.domains.enums;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;

public enum BillingCycle {
  WEEKLY,
  MONTHLY,
  QUARTERLY,
  YEARLY;

  /** The billing date after `current`. Month-based cycles are anchored to the day of month the
   * subscription first billed on and clamp to shorter months (an anchor of 31 lands on the 28th/
   * 29th/30th when it has to), so the day snaps back the following month instead of drifting. */
  public LocalDate next(LocalDate current, int anchorDay) {
    return switch (this) {
      case WEEKLY -> current.plusWeeks(1);
      case MONTHLY -> onAnchor(YearMonth.from(current).plusMonths(1), anchorDay);
      case QUARTERLY -> onAnchor(YearMonth.from(current).plusMonths(3), anchorDay);
      case YEARLY -> onAnchor(YearMonth.from(current).plusYears(1), anchorDay);
    };
  }

  /** What one billing costs per month, for comparing subscriptions on one scale. */
  public BigDecimal monthlyCost(BigDecimal amount) {
    return switch (this) {
      case WEEKLY -> amount.multiply(BigDecimal.valueOf(52)).divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
      case MONTHLY -> amount.setScale(2, RoundingMode.HALF_UP);
      case QUARTERLY -> amount.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
      case YEARLY -> amount.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
    };
  }

  public BigDecimal yearlyCost(BigDecimal amount) {
    return switch (this) {
      case WEEKLY -> amount.multiply(BigDecimal.valueOf(52)).setScale(2, RoundingMode.HALF_UP);
      case MONTHLY -> amount.multiply(BigDecimal.valueOf(12)).setScale(2, RoundingMode.HALF_UP);
      case QUARTERLY -> amount.multiply(BigDecimal.valueOf(4)).setScale(2, RoundingMode.HALF_UP);
      case YEARLY -> amount.setScale(2, RoundingMode.HALF_UP);
    };
  }

  private static LocalDate onAnchor(YearMonth month, int anchorDay) {
    return month.atDay(Math.min(anchorDay, month.lengthOfMonth()));
  }
}
