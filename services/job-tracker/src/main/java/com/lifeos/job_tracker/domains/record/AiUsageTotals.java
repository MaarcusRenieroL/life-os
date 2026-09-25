package com.lifeos.job_tracker.domains.record;

import java.math.BigDecimal;

/**
 * Every scalar total the AI usage widget needs, from one pass over {@code ai_usage_log} instead of
 * the five separate aggregate queries this used to run (all-time cost, month-to-date cost, call
 * count, input tokens, output tokens - each its own full scan of the same table).
 *
 * <p>Fields are wrapper types because the underlying {@code sum()}/{@code count()} return null on
 * an empty table; the accessors below are what callers should use, so a fresh install reports zero
 * rather than NPE-ing.
 */
public record AiUsageTotals(
    BigDecimal totalCostUsd,
    BigDecimal costThisMonthUsd,
    Long totalCalls,
    Long totalInputTokens,
    Long totalOutputTokens) {

  public BigDecimal totalCostOrZero() {
    return totalCostUsd == null ? BigDecimal.ZERO : totalCostUsd;
  }

  public BigDecimal costThisMonthOrZero() {
    return costThisMonthUsd == null ? BigDecimal.ZERO : costThisMonthUsd;
  }

  public long totalCallsOrZero() {
    return totalCalls == null ? 0L : totalCalls;
  }

  public long totalInputTokensOrZero() {
    return totalInputTokens == null ? 0L : totalInputTokens;
  }

  public long totalOutputTokensOrZero() {
    return totalOutputTokens == null ? 0L : totalOutputTokens;
  }
}
