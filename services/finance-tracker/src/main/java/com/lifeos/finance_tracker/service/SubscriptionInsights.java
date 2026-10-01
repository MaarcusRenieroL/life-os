package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** The "you're paying for something you don't use" heuristic, kept pure so it's directly
 * unit-testable. A subscription is flagged only while it's ACTIVE - a paused or cancelled one is
 * already dealt with.
 *
 * <p>Low use means the user rates it 1-2 out of 5, or hasn't used it in {@link #IDLE_DAYS} days.
 * Recent evidence wins over the rating: something used in the last {@link #RECENTLY_USED_DAYS}
 * days is not low-use however it was rated. High cost is a monthly-equivalent price at or above a
 * configured threshold, so a yearly plan and a monthly one compare fairly. wasteful is both. */
public final class SubscriptionInsights {

  static final int LOW_USE_RATING = 2;
  static final int IDLE_DAYS = 60;
  static final int RECENTLY_USED_DAYS = 14;

  private SubscriptionInsights() {}

  public record Flags(boolean lowUse, boolean highCost, boolean wasteful) {}

  public static Flags flags(Subscription subscription, LocalDate today, BigDecimal highCostMonthly) {
    if (subscription.getStatus() != SubscriptionStatus.ACTIVE) return new Flags(false, false, false);

    boolean lowUse = lowUse(subscription, today);
    boolean highCost = subscription.getBillingCycle().monthlyCost(subscription.getAmount()).compareTo(highCostMonthly) >= 0;
    return new Flags(lowUse, highCost, lowUse && highCost);
  }

  static boolean lowUse(Subscription subscription, LocalDate today) {
    LocalDate lastUsed = subscription.getLastUsedOn();
    long idle = lastUsed == null ? -1 : ChronoUnit.DAYS.between(lastUsed, today);

    if (lastUsed != null && idle <= RECENTLY_USED_DAYS) return false;
    boolean lowRating = subscription.getUsageRating() != null && subscription.getUsageRating() <= LOW_USE_RATING;
    boolean longIdle = lastUsed != null && idle >= IDLE_DAYS;
    return lowRating || longIdle;
  }
}
