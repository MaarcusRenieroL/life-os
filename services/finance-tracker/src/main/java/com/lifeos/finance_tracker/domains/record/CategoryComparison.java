package com.lifeos.finance_tracker.domains.record;

import java.math.BigDecimal;
import java.util.UUID;

public record CategoryComparison(
    UUID categoryId,
    BigDecimal currentMonthSpend,
    BigDecimal lastMonthSpend,
    BigDecimal difference,
    BigDecimal percentageChange) {}
