package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class SubscriptionInsightsTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);
  private static final BigDecimal THRESHOLD = new BigDecimal("500");

  private Subscription sub(String amount, BillingCycle cycle, Integer rating, LocalDate lastUsed) {
    return Subscription.builder().amount(new BigDecimal(amount)).billingCycle(cycle).usageRating(rating).lastUsedOn(lastUsed).status(SubscriptionStatus.ACTIVE).build();
  }

  @Test
  void aLowRatedExpensiveSubscriptionIsWasteful() {
    var flags = SubscriptionInsights.flags(sub("799", BillingCycle.MONTHLY, 1, null), TODAY, THRESHOLD);

    assertThat(flags.lowUse()).isTrue();
    assertThat(flags.highCost()).isTrue();
    assertThat(flags.wasteful()).isTrue();
  }

  @Test
  void aLowRatedCheapSubscriptionIsLowUseButNotWasteful() {
    var flags = SubscriptionInsights.flags(sub("99", BillingCycle.MONTHLY, 2, null), TODAY, THRESHOLD);

    assertThat(flags.lowUse()).isTrue();
    assertThat(flags.highCost()).isFalse();
    assertThat(flags.wasteful()).isFalse();
  }

  @Test
  void anExpensiveWellUsedSubscriptionIsNotFlagged() {
    var flags = SubscriptionInsights.flags(sub("1999", BillingCycle.MONTHLY, 5, null), TODAY, THRESHOLD);

    assertThat(flags.highCost()).isTrue();
    assertThat(flags.lowUse()).isFalse();
    assertThat(flags.wasteful()).isFalse();
  }

  @Test
  void aYearlyPlanIsComparedByItsMonthlyEquivalent() {
    // 6000/year = 500/month - exactly at the threshold, so high cost.
    assertThat(SubscriptionInsights.flags(sub("6000", BillingCycle.YEARLY, 1, null), TODAY, THRESHOLD).highCost()).isTrue();
    assertThat(SubscriptionInsights.flags(sub("5988", BillingCycle.YEARLY, 1, null), TODAY, THRESHOLD).highCost()).isFalse();
  }

  @Test
  void notUsedForTwoMonthsCountsAsLowUseEvenWithAGoodRating() {
    assertThat(SubscriptionInsights.lowUse(sub("999", BillingCycle.MONTHLY, 5, TODAY.minusDays(60)), TODAY)).isTrue();
    assertThat(SubscriptionInsights.lowUse(sub("999", BillingCycle.MONTHLY, 5, TODAY.minusDays(59)), TODAY)).isFalse();
  }

  @Test
  void recentUseOverridesALowRating() {
    assertThat(SubscriptionInsights.lowUse(sub("999", BillingCycle.MONTHLY, 1, TODAY.minusDays(14)), TODAY)).isFalse();
    assertThat(SubscriptionInsights.lowUse(sub("999", BillingCycle.MONTHLY, 1, TODAY.minusDays(15)), TODAY)).isTrue();
  }

  @Test
  void aSubscriptionWithNoUsageInformationIsNotFlagged() {
    assertThat(SubscriptionInsights.lowUse(sub("999", BillingCycle.MONTHLY, null, null), TODAY)).isFalse();
  }

  @Test
  void pausedAndCancelledSubscriptionsAreNeverFlagged() {
    for (SubscriptionStatus status : new SubscriptionStatus[] {SubscriptionStatus.PAUSED, SubscriptionStatus.CANCELLED}) {
      Subscription s = sub("999", BillingCycle.MONTHLY, 1, null);
      s.setStatus(status);

      assertThat(SubscriptionInsights.flags(s, TODAY, THRESHOLD).wasteful()).isFalse();
    }
  }
}
