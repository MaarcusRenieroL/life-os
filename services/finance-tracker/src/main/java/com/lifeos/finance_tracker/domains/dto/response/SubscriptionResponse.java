package com.lifeos.finance_tracker.domains.dto.response;

import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** lowUse / highCost / wasteful are computed at read time (see SubscriptionInsights) - wasteful is
 * the flag the UI surfaces: something you barely use that costs a lot. daysUntilRenewal is null
 * for a subscription that isn't ACTIVE. */
public record SubscriptionResponse(
    UUID id,
    String name,
    BigDecimal amount,
    BillingCycle billingCycle,
    BigDecimal monthlyCost,
    BigDecimal yearlyCost,
    LocalDate nextBillingDate,
    Integer daysUntilRenewal,
    SubscriptionStatus status,
    UUID accountId,
    UUID categoryId,
    boolean autoCreateExpense,
    int reminderDaysBefore,
    LocalDate lastBilledOn,
    Integer usageRating,
    LocalDate lastUsedOn,
    boolean lowUse,
    boolean highCost,
    boolean wasteful,
    String notes,
    Instant createdAt) {}
