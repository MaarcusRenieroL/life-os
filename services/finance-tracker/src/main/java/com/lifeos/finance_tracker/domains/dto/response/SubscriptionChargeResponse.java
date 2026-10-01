package com.lifeos.finance_tracker.domains.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** One billing that was booked as an expense. */
public record SubscriptionChargeResponse(UUID transactionId, Instant date, BigDecimal amount, String description) {}
