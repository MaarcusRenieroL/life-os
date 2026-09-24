package com.lifeos.finance_tracker.domains.record;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One row of {@code TransactionRepository#sumCategorySpendForPeriods} - a single category's spend in
 * each of the two compared periods, aggregated in one grouped pass rather than two queries per
 * category. Only an intermediate shape; {@link CategoryComparison} is what callers get back.
 */
public record CategoryPeriodSpend(
    UUID categoryId, BigDecimal currentPeriodSpend, BigDecimal previousPeriodSpend) {}
