package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class BillingCycleTest {

  @Test
  void weeklyAddsSevenDays() {
    assertThat(BillingCycle.WEEKLY.next(LocalDate.of(2026, 9, 30), 30)).isEqualTo(LocalDate.of(2026, 10, 7));
  }

  @Test
  void aMonthlyAnchorOf31ClampsToShortMonthsThenSnapsBack() {
    LocalDate jan = LocalDate.of(2026, 1, 31);
    LocalDate feb = BillingCycle.MONTHLY.next(jan, 31);
    LocalDate mar = BillingCycle.MONTHLY.next(feb, 31);
    LocalDate apr = BillingCycle.MONTHLY.next(mar, 31);

    assertThat(feb).isEqualTo(LocalDate.of(2026, 2, 28));
    assertThat(mar).isEqualTo(LocalDate.of(2026, 3, 31));
    assertThat(apr).isEqualTo(LocalDate.of(2026, 4, 30));
  }

  @Test
  void monthlyRollsOverTheYearBoundary() {
    assertThat(BillingCycle.MONTHLY.next(LocalDate.of(2026, 12, 15), 15)).isEqualTo(LocalDate.of(2027, 1, 15));
  }

  @Test
  void quarterlyAddsThreeMonthsOnTheAnchor() {
    assertThat(BillingCycle.QUARTERLY.next(LocalDate.of(2026, 11, 30), 30)).isEqualTo(LocalDate.of(2027, 2, 28));
  }

  @Test
  void aLeapDayYearlyAnchorLandsOnFeb28InCommonYearsAndFeb29InLeapYears() {
    LocalDate leap = LocalDate.of(2028, 2, 29);
    LocalDate y1 = BillingCycle.YEARLY.next(leap, 29);
    LocalDate y2 = BillingCycle.YEARLY.next(y1, 29);
    LocalDate y3 = BillingCycle.YEARLY.next(y2, 29);
    LocalDate y4 = BillingCycle.YEARLY.next(y3, 29);

    assertThat(y1).isEqualTo(LocalDate.of(2029, 2, 28));
    assertThat(y4).isEqualTo(LocalDate.of(2032, 2, 29));
  }

  @Test
  void costsNormaliseToMonthlyAndYearly() {
    BigDecimal hundred = new BigDecimal("100");

    assertThat(BillingCycle.MONTHLY.monthlyCost(hundred)).isEqualByComparingTo("100.00");
    assertThat(BillingCycle.YEARLY.monthlyCost(new BigDecimal("1200"))).isEqualByComparingTo("100.00");
    assertThat(BillingCycle.QUARTERLY.monthlyCost(new BigDecimal("300"))).isEqualByComparingTo("100.00");
    assertThat(BillingCycle.WEEKLY.monthlyCost(new BigDecimal("12"))).isEqualByComparingTo("52.00");

    assertThat(BillingCycle.MONTHLY.yearlyCost(hundred)).isEqualByComparingTo("1200.00");
    assertThat(BillingCycle.QUARTERLY.yearlyCost(hundred)).isEqualByComparingTo("400.00");
    assertThat(BillingCycle.WEEKLY.yearlyCost(hundred)).isEqualByComparingTo("5200.00");
    assertThat(BillingCycle.YEARLY.yearlyCost(hundred)).isEqualByComparingTo("100.00");
  }
}
