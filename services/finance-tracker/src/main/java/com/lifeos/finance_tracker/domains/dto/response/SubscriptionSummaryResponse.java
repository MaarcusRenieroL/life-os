package com.lifeos.finance_tracker.domains.dto.response;

import java.math.BigDecimal;

/** Totals over ACTIVE subscriptions only. wastefulMonthly is what the flagged low-use,
 * high-cost ones cost per month - the number cancelling them would save. */
public record SubscriptionSummaryResponse(
    int activeCount,
    BigDecimal monthlyTotal,
    BigDecimal yearlyTotal,
    int wastefulCount,
    BigDecimal wastefulMonthly,
    int renewingSoonCount,
    BigDecimal renewingSoonTotal) {}
