package com.lifeos.tasks.domains.enums;

import java.time.LocalDate;

public enum GoalReviewFrequency {
  BIWEEKLY,
  MONTHLY;

  public LocalDate nextAfter(LocalDate date) {
    return this == BIWEEKLY ? date.plusWeeks(2) : date.plusMonths(1);
  }
}
