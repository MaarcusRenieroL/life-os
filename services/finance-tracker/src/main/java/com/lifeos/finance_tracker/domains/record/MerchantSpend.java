package com.lifeos.finance_tracker.domains.record;

import java.math.BigDecimal;

public record MerchantSpend(String merchant, BigDecimal totalSpend) {}
