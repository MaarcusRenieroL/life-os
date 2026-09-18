package com.lifeos.job_tracker.integration;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/** Self-tracked $/1M-token rates (first-party API pricing) for cost estimation - there's no
 * per-request cost field on the Messages API response, only token counts, so this has to be kept
 * in sync by hand when pricing changes. Unknown/future model ids return no estimate rather than a
 * guessed number. */
final class ClaudePricing {

  private record Rate(BigDecimal inputPerMillion, BigDecimal outputPerMillion) {}

  private static final Map<String, Rate> RATES =
      Map.ofEntries(
          Map.entry("claude-fable-5-1", new Rate(bd(10.00), bd(50.00))),
          Map.entry("claude-mythos-5-1", new Rate(bd(10.00), bd(50.00))),
          Map.entry("claude-fable-5", new Rate(bd(10.00), bd(50.00))),
          Map.entry("claude-opus-5", new Rate(bd(5.00), bd(25.00))),
          Map.entry("claude-opus-4-8", new Rate(bd(5.00), bd(25.00))),
          Map.entry("claude-opus-4-7", new Rate(bd(5.00), bd(25.00))),
          Map.entry("claude-opus-4-6", new Rate(bd(5.00), bd(25.00))),
          Map.entry("claude-sonnet-5", new Rate(bd(2.00), bd(10.00))),
          Map.entry("claude-sonnet-4-6", new Rate(bd(3.00), bd(15.00))),
          Map.entry("claude-haiku-4-5", new Rate(bd(1.00), bd(5.00))));

  private ClaudePricing() {}

  /** Null when the model isn't in the table - callers should store the tokens without a cost
   * rather than fabricate a number for an unrecognized/future model. */
  static BigDecimal estimateCostUsd(String model, long inputTokens, long outputTokens) {
    Rate rate = RATES.get(model);
    if (rate == null) return null;
    BigDecimal inputCost = rate.inputPerMillion().multiply(BigDecimal.valueOf(inputTokens)).divide(bd(1_000_000), 6, RoundingMode.HALF_UP);
    BigDecimal outputCost = rate.outputPerMillion().multiply(BigDecimal.valueOf(outputTokens)).divide(bd(1_000_000), 6, RoundingMode.HALF_UP);
    return inputCost.add(outputCost).setScale(4, RoundingMode.HALF_UP);
  }

  private static BigDecimal bd(double value) {
    return BigDecimal.valueOf(value);
  }
}
