package com.lifeos.finance_tracker.domains.record;

import java.math.BigDecimal;

public record DashboardSummary(BigDecimal totalIncome, BigDecimal totalExpenses, BigDecimal fixedMonthlyIncome) {
  // Savings is measured against the user's fixed salary (fixedMonthlyIncome), not
  // totalIncome - totalIncome sums every CREDIT transaction, including one-off
  // refunds/transfers, which aren't real income and would inflate this figure.
  public BigDecimal getSavings() {
    BigDecimal income = fixedMonthlyIncome != null ? fixedMonthlyIncome : BigDecimal.ZERO;
    BigDecimal expenses = totalExpenses != null ? totalExpenses : BigDecimal.ZERO;
    return income.subtract(expenses);
  }
}
