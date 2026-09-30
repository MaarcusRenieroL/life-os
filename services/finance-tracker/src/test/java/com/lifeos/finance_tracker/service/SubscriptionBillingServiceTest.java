package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.enums.BillingCycle;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import com.lifeos.finance_tracker.repository.SubscriptionRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SubscriptionBillingServiceTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);

  @Mock private SubscriptionRepository subscriptionRepository;
  @Mock private TransactionService transactionService;
  @Mock private NotificationEventPublisher notificationEventPublisher;

  private SubscriptionBillingService service;
  private final UUID userId = UUID.randomUUID();
  private final UUID accountId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new SubscriptionBillingService(subscriptionRepository, transactionService, notificationEventPublisher);
    when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
  }

  private Subscription sub(LocalDate next, BillingCycle cycle, boolean auto) {
    return Subscription.builder()
        .id(UUID.randomUUID())
        .userId(userId)
        .name("Netflix")
        .amount(new BigDecimal("649"))
        .billingCycle(cycle)
        .nextBillingDate(next)
        .billingAnchorDay(next.getDayOfMonth())
        .accountId(accountId)
        .autoCreateExpense(auto)
        .status(SubscriptionStatus.ACTIVE)
        .build();
  }

  // ---- billing ----

  @Test
  void aDueSubscriptionBooksItsExpenseAndMovesToTheNextCycle() {
    Subscription s = sub(TODAY, BillingCycle.MONTHLY, true);

    int cycles = service.billDue(s, TODAY);

    assertThat(cycles).isEqualTo(1);
    assertThat(s.getNextBillingDate()).isEqualTo(LocalDate.of(2026, 10, 30));
    assertThat(s.getLastBilledOn()).isEqualTo(TODAY);
    ArgumentCaptor<String> reference = ArgumentCaptor.forClass(String.class);
    verify(transactionService).createSubscriptionCharge(eq(userId), eq(accountId), any(), eq("Netflix"), eq(new BigDecimal("649")), any(), reference.capture());
    assertThat(reference.getValue()).isEqualTo("subscription:" + s.getId() + ":2026-09-30");
  }

  @Test
  void aSubscriptionNotYetDueIsLeftAlone() {
    Subscription s = sub(TODAY.plusDays(1), BillingCycle.MONTHLY, true);

    assertThat(service.billDue(s, TODAY)).isZero();

    assertThat(s.getNextBillingDate()).isEqualTo(TODAY.plusDays(1));
    verify(transactionService, never()).createSubscriptionCharge(any(), any(), any(), any(), any(), any(), any());
  }

  @Test
  void aMissedRunCatchesUpEveryDueCycleWithOneDatedExpenseEach() {
    // Due 3 weeks ago on a weekly plan: 3 cycles missed plus the one due today.
    Subscription s = sub(TODAY.minusWeeks(3), BillingCycle.WEEKLY, true);

    int cycles = service.billDue(s, TODAY);

    assertThat(cycles).isEqualTo(4);
    assertThat(s.getNextBillingDate()).isEqualTo(TODAY.plusWeeks(1));
    ArgumentCaptor<String> references = ArgumentCaptor.forClass(String.class);
    verify(transactionService, org.mockito.Mockito.times(4)).createSubscriptionCharge(any(), any(), any(), any(), any(), any(), references.capture());
    assertThat(references.getAllValues()).doesNotHaveDuplicates();
  }

  @Test
  void catchUpIsBoundedSoAnAncientDateCantBookHundredsOfCharges() {
    Subscription s = sub(TODAY.minusYears(10), BillingCycle.WEEKLY, true);

    assertThat(service.billDue(s, TODAY)).isEqualTo(SubscriptionBillingService.MAX_CATCH_UP_CYCLES);
  }

  @Test
  void withoutAutoExpenseTheDateStillAdvancesButNothingIsBooked() {
    Subscription s = sub(TODAY, BillingCycle.MONTHLY, false);

    service.billDue(s, TODAY);

    assertThat(s.getNextBillingDate()).isEqualTo(LocalDate.of(2026, 10, 30));
    verify(transactionService, never()).createSubscriptionCharge(any(), any(), any(), any(), any(), any(), any());
  }

  @Test
  void aFailedChargeLeavesTheDateWhereItWasSoTheNextRunRetries() {
    Subscription s = sub(TODAY, BillingCycle.MONTHLY, true);
    when(transactionService.createSubscriptionCharge(any(), any(), any(), any(), any(), any(), any())).thenThrow(new IllegalStateException("account gone"));

    org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.billDue(s, TODAY)).isInstanceOf(IllegalStateException.class);

    assertThat(s.getNextBillingDate()).isEqualTo(TODAY);
    assertThat(s.getLastBilledOn()).isNull();
  }

  @Test
  void chargeNowBooksTheNextBillingDatedNoLaterThanTodayAndAdvances() {
    Subscription s = sub(TODAY.plusDays(5), BillingCycle.MONTHLY, false);
    s.setAutoCreateExpense(true);

    service.chargeNow(s, TODAY);

    ArgumentCaptor<java.time.Instant> date = ArgumentCaptor.forClass(java.time.Instant.class);
    ArgumentCaptor<String> reference = ArgumentCaptor.forClass(String.class);
    verify(transactionService).createSubscriptionCharge(any(), any(), date.capture(), any(), any(), any(), reference.capture());
    assertThat(date.getValue()).isEqualTo(TODAY.atStartOfDay(SubscriptionBillingService.ZONE).toInstant());
    // Keyed by the billing date it covers, not the day it was recorded - so the nightly job can't
    // book the same cycle again.
    assertThat(reference.getValue()).endsWith(TODAY.plusDays(5).toString());
    assertThat(s.getNextBillingDate()).isEqualTo(LocalDate.of(2026, 11, 5));
  }

  // ---- reminders ----

  @Test
  void aReminderIsSentOnceWhenTheRenewalEntersTheWindow() {
    Subscription s = sub(TODAY.plusDays(3), BillingCycle.MONTHLY, true);
    s.setReminderDaysBefore(3);

    assertThat(service.remindIfDue(s, TODAY)).isTrue();

    verify(notificationEventPublisher)
        .publish(eq(userId), eq(NotificationEventType.FINANCE_SUBSCRIPTION_RENEWING), eq("Netflix renews in 3 days"), any(String.class), any(Map.class));
    assertThat(s.getReminderSentFor()).isEqualTo(TODAY.plusDays(3));

    // The next day's scan must not repeat it.
    assertThat(service.remindIfDue(s, TODAY.plusDays(1))).isFalse();
  }

  @Test
  void noReminderBeforeTheWindowOpensOrAfterTheRenewalPassed() {
    Subscription early = sub(TODAY.plusDays(4), BillingCycle.MONTHLY, true);
    Subscription late = sub(TODAY.minusDays(1), BillingCycle.MONTHLY, true);

    assertThat(service.remindIfDue(early, TODAY)).isFalse();
    assertThat(service.remindIfDue(late, TODAY)).isFalse();
    verify(notificationEventPublisher, never()).publish(any(), any(), any(), any(), any(Map.class));
  }

  @Test
  void aScanThatMissedTheExactDayStillSendsTheReminderLaterInTheWindow() {
    Subscription s = sub(TODAY.plusDays(1), BillingCycle.MONTHLY, true);

    assertThat(service.remindIfDue(s, TODAY)).isTrue();
    verify(notificationEventPublisher).publish(any(), any(), eq("Netflix renews tomorrow"), any(), any(Map.class));
  }

  @Test
  void theNextCycleGetsItsOwnReminder() {
    Subscription s = sub(TODAY.plusDays(2), BillingCycle.MONTHLY, true);
    service.remindIfDue(s, TODAY);

    s.setNextBillingDate(LocalDate.of(2026, 11, 2));

    assertThat(service.remindIfDue(s, LocalDate.of(2026, 10, 31))).isTrue();
  }

  @Test
  void pausedSubscriptionsGetNoReminders() {
    Subscription s = sub(TODAY.plusDays(1), BillingCycle.MONTHLY, true);
    s.setStatus(SubscriptionStatus.PAUSED);

    assertThat(service.remindIfDue(s, TODAY)).isFalse();
  }

  @Test
  void aRenewalTodayIsAnnouncedAsToday() {
    Subscription s = sub(TODAY, BillingCycle.MONTHLY, true);

    service.remindIfDue(s, TODAY);

    verify(notificationEventPublisher).publish(any(), any(), eq("Netflix renews today"), any(), any(Map.class));
  }
}
