package com.lifeos.finance_tracker.domains.record;

import java.math.BigDecimal;

public record MonthlyTrend(String month, BigDecimal totalSpend) {}
