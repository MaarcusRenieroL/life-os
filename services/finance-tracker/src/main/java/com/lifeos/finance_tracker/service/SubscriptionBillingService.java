package com.lifeos.finance_tracker.service;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import com.lifeos.finance_tracker.repository.SubscriptionRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** What runs when a subscription comes due: book the expense, move the next billing date on, and
 * remind the user before it happens. Each subscription is processed in its own transaction (see
 * the scheduler), so one user's broken subscription - say its account was deleted - can't stop
 * everyone else's from billing. */
@Service
@RequiredArgsConstructor
public class SubscriptionBillingService {

  // Same zone the rest of finance-tracker's scheduled jobs use (see FinanceAttentionScanner).
  static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

  // If the job was down for a long stretch, catch up the missed cycles - but bounded, so a
  // subscription that somehow ended up years in the past can't book hundreds of charges in one go.
  static final int MAX_CATCH_UP_CYCLES = 24;

  private final SubscriptionRepository subscriptionRepository;
  private final TransactionService transactionService;
  private final NotificationEventPublisher notificationEventPublisher;

  public static LocalDate today() {
    return LocalDate.now(ZONE);
  }

  /** Books every billing that has come due (next billing date on or before `today`) and advances
   * the subscription past today. Returns how many cycles were processed. A billing is only booked
   * as an expense when the subscription is set to auto-create one and has an account; otherwise
   * the date still moves on, so "next renewal" stays truthful for one whose charge arrives via
   * bank import instead. */
  @Transactional
  public int billDue(Subscription subscription, LocalDate today) {
    int cycles = 0;
    while (!subscription.getNextBillingDate().isAfter(today) && cycles < MAX_CATCH_UP_CYCLES) {
      LocalDate billingDate = subscription.getNextBillingDate();
      bookCharge(subscription, billingDate);
      advance(subscription, billingDate);
      cycles++;
    }
    subscriptionRepository.save(subscription);
    return cycles;
  }

  /** Records the next billing right now instead of waiting for its date - "I just paid this". The
   * expense is dated today at the latest (never in the future) and the subscription moves on to
   * the following cycle. */
  @Transactional
  public Subscription chargeNow(Subscription subscription, LocalDate today) {
    LocalDate billingDate = subscription.getNextBillingDate();
    bookCharge(subscription, billingDate.isAfter(today) ? today : billingDate, billingDate);
    advance(subscription, billingDate);
    return subscriptionRepository.save(subscription);
  }

  /** Sends the renewal reminder once per cycle, from `reminderDaysBefore` days out until the
   * renewal - so a scan that misses the exact day still sends it. Returns whether one was sent. */
  @Transactional
  public boolean remindIfDue(Subscription subscription, LocalDate today) {
    if (subscription.getStatus() != SubscriptionStatus.ACTIVE) return false;
    LocalDate renewal = subscription.getNextBillingDate();
    if (renewal.equals(subscription.getReminderSentFor())) return false;

    long daysUntil = ChronoUnit.DAYS.between(today, renewal);
    if (daysUntil < 0 || daysUntil > subscription.getReminderDaysBefore()) return false;

    notificationEventPublisher.publish(
        subscription.getUserId(),
        NotificationEventType.FINANCE_SUBSCRIPTION_RENEWING,
        subscription.getName() + (daysUntil == 0 ? " renews today" : daysUntil == 1 ? " renews tomorrow" : " renews in " + daysUntil + " days"),
        "₹" + subscription.getAmount().stripTrailingZeros().toPlainString() + " on " + renewal,
        Map.of("subscriptionId", subscription.getId().toString()));
    subscription.setReminderSentFor(renewal);
    subscriptionRepository.save(subscription);
    return true;
  }

  static String sourceReference(Subscription subscription, LocalDate billingDate) {
    return "subscription:" + subscription.getId() + ":" + billingDate;
  }

  private void bookCharge(Subscription subscription, LocalDate billingDate) {
    bookCharge(subscription, billingDate, billingDate);
  }

  private void bookCharge(Subscription subscription, LocalDate transactionDate, LocalDate billingDate) {
    if (!subscription.isAutoCreateExpense() || subscription.getAccountId() == null) return;
    transactionService.createSubscriptionCharge(
        subscription.getUserId(),
        subscription.getAccountId(),
        transactionDate.atStartOfDay(ZONE).toInstant(),
        subscription.getName(),
        subscription.getAmount(),
        subscription.getCategoryId(),
        sourceReference(subscription, billingDate));
  }

  private void advance(Subscription subscription, LocalDate billingDate) {
    subscription.setLastBilledOn(billingDate);
    subscription.setNextBillingDate(subscription.getBillingCycle().next(billingDate, subscription.getBillingAnchorDay()));
  }
}
