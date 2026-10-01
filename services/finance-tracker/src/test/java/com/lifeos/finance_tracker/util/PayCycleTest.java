package com.lifeos.finance_tracker.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class PayCycleTest {

  @Test
  void aCycleStartingOnTheFirstIsTheCalendarMonth() {
    PayCycle.Window w = PayCycle.containing(LocalDate.of(2026, 10, 15), 1);
    assertThat(w.firstDay()).isEqualTo(LocalDate.of(2026, 10, 1));
    assertThat(w.lastDay()).isEqualTo(LocalDate.of(2026, 10, 31));
  }

  @Test
  void spendingAfterPaydayBelongsToTheCycleThatSalaryPaysFor() {
    // Salary lands on the 25th: 26 Sep is in the cycle that runs 25 Sep - 24 Oct.
    PayCycle.Window w = PayCycle.containing(LocalDate.of(2026, 9, 26), 25);
    assertThat(w.firstDay()).isEqualTo(LocalDate.of(2026, 9, 25));
    assertThat(w.lastDay()).isEqualTo(LocalDate.of(2026, 10, 24));
    // ...and 10 Oct is still in it, while 24 Sep belongs to the previous one.
    assertThat(PayCycle.containing(LocalDate.of(2026, 10, 10), 25).firstDay()).isEqualTo(LocalDate.of(2026, 9, 25));
    assertThat(PayCycle.containing(LocalDate.of(2026, 9, 24), 25).firstDay()).isEqualTo(LocalDate.of(2026, 8, 25));
  }

  @Test
  void theCycleRollsOverTheYearBoundary() {
    PayCycle.Window w = PayCycle.containing(LocalDate.of(2027, 1, 3), 25);
    assertThat(w.firstDay()).isEqualTo(LocalDate.of(2026, 12, 25));
    assertThat(w.lastDay()).isEqualTo(LocalDate.of(2027, 1, 24));
  }

  @Test
  void theWindowBoundariesAreMidnightIstSoNothingLandsInTheWrongCycle() {
    PayCycle.Window w = PayCycle.containing(LocalDate.of(2026, 10, 15), 1);
    // 1 Oct 00:00 IST is 30 Sep 18:30 UTC.
    assertThat(w.start()).isEqualTo(Instant.parse("2026-09-30T18:30:00Z"));
    assertThat(w.end()).isEqualTo(Instant.parse("2026-10-31T18:29:59.999Z"));
    // A payment at 23:50 IST on 30 Sep is still September's cycle.
    assertThat(PayCycle.containing(Instant.parse("2026-09-30T18:20:00Z"), 1).firstDay()).isEqualTo(LocalDate.of(2026, 9, 1));
  }

  @Test
  void theStartDayIsClampedToSomethingEveryMonthHas() {
    assertThat(PayCycle.clamp(31)).isEqualTo(28);
    assertThat(PayCycle.clamp(0)).isEqualTo(1);
    assertThat(PayCycle.containing(LocalDate.of(2026, 2, 28), 31).firstDay()).isEqualTo(LocalDate.of(2026, 2, 28));
  }

  @Test
  void theCycleBeforeIsTheOneEndingJustBeforeThisStarts() {
    PayCycle.Window before = PayCycle.before(Instant.parse("2026-10-10T06:00:00Z"), 25);
    assertThat(before.firstDay()).isEqualTo(LocalDate.of(2026, 8, 25));
    assertThat(before.lastDay()).isEqualTo(LocalDate.of(2026, 9, 24));
  }

  @Test
  void keyIsTheFirstDay() {
    assertThat(PayCycle.containing(LocalDate.of(2026, 9, 26), 25).key()).isEqualTo("2026-09-25");
  }
}
