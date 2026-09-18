package com.lifeos.job_tracker.domains.record;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record AiUsageSummaryResponse(
    BigDecimal totalCostUsd,
    BigDecimal costThisMonthUsd,
    long totalCalls,
    long totalInputTokens,
    long totalOutputTokens,
    List<DailyCost> costLast30Days) {

  public record DailyCost(LocalDate date, BigDecimal costUsd) {}
}
