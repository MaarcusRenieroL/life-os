package com.lifeos.finance_tracker.domains.record;

import java.math.BigDecimal;

public record DashboardSummary(BigDecimal totalIncome, BigDecimal totalExpenses) {
  public BigDecimal getSavings() {
    BigDecimal income = totalIncome != null ? totalIncome : BigDecimal.ZERO;
    BigDecimal expenses = totalExpenses != null ? totalExpenses : BigDecimal.ZERO;
    return income.subtract(expenses);
  }
}
