package com.lifeos.core.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.core.domains.enums.EmailCategory;
import com.lifeos.core.domains.record.EmailClassification;
import com.lifeos.core.service.EmailActionPlanner.Decision;
import com.lifeos.core.service.EmailActionPlanner.Verdict;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class EmailActionPlannerTest {

  private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
  private static final Instant NOW = Instant.parse("2026-09-30T06:00:00Z"); // 11:30 IST, 30 Sep

  private static EmailClassification task(String confidence, String title, String due) {
    return new EmailClassification("TASK", confidence, "s", new EmailClassification.Task(title, due, null, "HIGH", "n"), null, null, null);
  }

  private static EmailClassification bill(String confidence, String payee, Double amount, String due) {
    return new EmailClassification("BILL", confidence, "s", null, new EmailClassification.Bill(payee, amount, "INR", due), null, null);
  }

  private static EmailClassification event(String confidence, EmailClassification.Event e) {
    return new EmailClassification("EVENT", confidence, "s", null, null, e, null);
  }

  private static EmailClassification sub(String confidence, EmailClassification.Subscription s) {
    return new EmailClassification("SUBSCRIPTION", confidence, "s", null, null, null, s);
  }

  private static Decision decide(EmailClassification c) {
    return EmailActionPlanner.decide(c, NOW, ZONE);
  }

  // -- nothing to do ------------------------------------------------------

  @Test
  void ignoredUnknownAndLowConfidenceMailIsNeverActedOn() {
    assertThat(decide(new EmailClassification("IGNORE", "HIGH", "newsletter", null, null, null, null)).verdict()).isEqualTo(Verdict.IGNORE);
    assertThat(decide(new EmailClassification("FLIGHT", "HIGH", "s", null, null, null, null)).verdict()).isEqualTo(Verdict.IGNORE);
    assertThat(decide(null).verdict()).isEqualTo(Verdict.IGNORE);
    assertThat(decide(task("LOW", "Sign the form", "2026-10-05")).verdict()).isEqualTo(Verdict.IGNORE);
  }

  // -- tasks --------------------------------------------------------------

  @Test
  void aConfidentTaskWithADeadlineIsAppliedStraightAway() {
    Decision d = decide(task("HIGH", "Submit the tax form", "2026-10-05"));

    assertThat(d.verdict()).isEqualTo(Verdict.AUTO);
    assertThat(d.action().kind()).isEqualTo("TASK");
    assertThat(d.action().dueDate()).isEqualTo(LocalDate.of(2026, 10, 5));
    assertThat(d.action().priority()).isEqualTo("HIGH");
  }

  @Test
  void aTaskWithoutADeadlineOrOnlyMediumConfidenceAsksFirst() {
    assertThat(decide(task("HIGH", "Read the update", null)).verdict()).isEqualTo(Verdict.REVIEW);
    assertThat(decide(task("MEDIUM", "Submit the tax form", "2026-10-05")).verdict()).isEqualTo(Verdict.REVIEW);
    assertThat(decide(task("HIGH", "Submit the tax form", "next friday")).verdict()).isEqualTo(Verdict.REVIEW);
  }

  @Test
  void aTaskWhoseDeadlineLongPassedOrHasNoTitleIsDropped() {
    assertThat(decide(task("HIGH", "Submit the form", "2026-06-01")).verdict()).isEqualTo(Verdict.IGNORE);
    assertThat(decide(task("HIGH", "  ", "2026-10-05")).verdict()).isEqualTo(Verdict.IGNORE);
  }

  // -- bills --------------------------------------------------------------

  @Test
  void aBillBecomesAHighPriorityPayTaskDueOnItsDueDate() {
    Decision d = decide(bill("HIGH", "HDFC Credit Card", 12500.0, "2026-10-04"));

    assertThat(d.verdict()).isEqualTo(Verdict.AUTO);
    assertThat(d.action().title()).isEqualTo("Pay HDFC Credit Card - INR 12500");
    assertThat(d.action().priority()).isEqualTo("HIGH");
    assertThat(d.action().dueDate()).isEqualTo(LocalDate.of(2026, 10, 4));
  }

  @Test
  void aBillWithoutADueDateAsksFirstAndOneLongOverdueIsDropped() {
    assertThat(decide(bill("HIGH", "Electricity", 900.0, null)).verdict()).isEqualTo(Verdict.REVIEW);
    assertThat(decide(bill("HIGH", "Electricity", 900.0, "2026-05-01")).verdict()).isEqualTo(Verdict.IGNORE);
    assertThat(decide(bill("HIGH", " ", 900.0, "2026-10-04")).verdict()).isEqualTo(Verdict.IGNORE);
  }

  // -- events -------------------------------------------------------------

  @Test
  void aTimedEventIsReadInTheUsersZoneAndDefaultsToAnHourLong() {
    Decision d = decide(event("HIGH", new EmailClassification.Event("Dentist", "2026-10-03T14:30", null, null, null, false, "Clinic", null)));

    assertThat(d.verdict()).isEqualTo(Verdict.AUTO);
    assertThat(d.action().allDay()).isFalse();
    assertThat(d.action().startAt()).isEqualTo(Instant.parse("2026-10-03T09:00:00Z")); // 14:30 IST
    assertThat(d.action().endAt()).isEqualTo(Instant.parse("2026-10-03T10:00:00Z"));
    assertThat(d.action().location()).isEqualTo("Clinic");
  }

  @Test
  void anExplicitOffsetIsHonouredAndAnEndBeforeTheStartIsReplaced() {
    Decision d = decide(event("HIGH", new EmailClassification.Event("Call", "2026-10-03T10:00:00+00:00", "2026-10-03T09:00", null, null, false, null, null)));

    assertThat(d.action().startAt()).isEqualTo(Instant.parse("2026-10-03T10:00:00Z"));
    assertThat(d.action().endAt()).isEqualTo(Instant.parse("2026-10-03T11:00:00Z"));
  }

  @Test
  void anAllDayEventUsesDatesRatherThanTimes() {
    Decision d = decide(event("HIGH", new EmailClassification.Event("Conference", null, null, "2026-10-10", "2026-10-12", true, "Goa", null)));

    assertThat(d.verdict()).isEqualTo(Verdict.AUTO);
    assertThat(d.action().allDay()).isTrue();
    assertThat(d.action().startDate()).isEqualTo(LocalDate.of(2026, 10, 10));
    assertThat(d.action().endDate()).isEqualTo(LocalDate.of(2026, 10, 12));
  }

  @Test
  void aPastEventIsDroppedAndAnUnreadableTimeAsksFirst() {
    assertThat(decide(event("HIGH", new EmailClassification.Event("Old meeting", "2026-09-01T10:00", null, null, null, false, null, null))).verdict())
        .isEqualTo(Verdict.IGNORE);
    assertThat(decide(event("HIGH", new EmailClassification.Event("Meeting", "tomorrow at ten", null, null, null, false, null, null))).verdict())
        .isEqualTo(Verdict.REVIEW);
  }

  // -- subscriptions ------------------------------------------------------

  @Test
  void aCompleteSubscriptionIsTrackedAutomatically() {
    Decision d = decide(sub("HIGH", new EmailClassification.Subscription("Netflix", 649.0, "INR", "monthly", "2026-10-15")));

    assertThat(d.verdict()).isEqualTo(Verdict.AUTO);
    assertThat(d.action().kind()).isEqualTo("SUBSCRIPTION");
    assertThat(d.action().billingCycle()).isEqualTo("MONTHLY");
    assertThat(d.action().amount()).isEqualByComparingTo("649");
    assertThat(d.action().nextBillingDate()).isEqualTo(LocalDate.of(2026, 10, 15));
  }

  @Test
  void aSubscriptionMissingAnyRequiredDetailAsksFirst() {
    assertThat(decide(sub("HIGH", new EmailClassification.Subscription("Netflix", null, "INR", "MONTHLY", "2026-10-15"))).verdict()).isEqualTo(Verdict.REVIEW);
    assertThat(decide(sub("HIGH", new EmailClassification.Subscription("Netflix", 649.0, "INR", "sometimes", "2026-10-15"))).verdict()).isEqualTo(Verdict.REVIEW);
    assertThat(decide(sub("HIGH", new EmailClassification.Subscription("Netflix", 649.0, "INR", "MONTHLY", null))).verdict()).isEqualTo(Verdict.REVIEW);
    assertThat(decide(sub("HIGH", new EmailClassification.Subscription("", 649.0, "INR", "MONTHLY", "2026-10-15"))).verdict()).isEqualTo(Verdict.IGNORE);
  }

  @Test
  void categoriesParseLeniently() {
    assertThat(EmailActionPlanner.parseCategory(" bill ")).isEqualTo(EmailCategory.BILL);
    assertThat(EmailActionPlanner.parseCategory("nonsense")).isEqualTo(EmailCategory.IGNORE);
    assertThat(EmailActionPlanner.parseCategory(null)).isEqualTo(EmailCategory.IGNORE);
  }
}
