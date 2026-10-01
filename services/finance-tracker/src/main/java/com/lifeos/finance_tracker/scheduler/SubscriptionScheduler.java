package com.lifeos.finance_tracker.scheduler;

import com.lifeos.finance_tracker.domains.entity.Subscription;
import com.lifeos.finance_tracker.domains.enums.SubscriptionStatus;
import com.lifeos.finance_tracker.repository.SubscriptionRepository;
import com.lifeos.finance_tracker.service.SubscriptionBillingService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Two daily jobs over every user's ACTIVE subscriptions - billing just after midnight (so the
 * day's charges exist before anyone looks) and renewal reminders in the morning. Unlike
 * RecurringDetectionScheduler this isn't scoped to the owner user: billing something the user
 * declared is cheap and must work for whoever declared it. Each subscription is handled in its own
 * transaction and failures are contained per subscription - a bad one is logged and retried the
 * next night, and never blocks the rest. */
@Component
@RequiredArgsConstructor
public class SubscriptionScheduler {

  private static final Logger log = LoggerFactory.getLogger(SubscriptionScheduler.class);

  private final SubscriptionRepository subscriptionRepository;
  private final SubscriptionBillingService billingService;

  @Scheduled(cron = "${finance.subscriptions.bill-cron:0 30 0 * * *}")
  public void billDueSubscriptions() {
    LocalDate today = SubscriptionBillingService.today();
    for (Subscription subscription : subscriptionRepository.findAllByStatus(SubscriptionStatus.ACTIVE)) {
      if (subscription.getNextBillingDate().isAfter(today)) continue;
      try {
        billingService.billDue(subscription, today);
      } catch (Exception exception) {
        log.warn("Subscription billing failed for {} ({}): {}", subscription.getId(), subscription.getName(), exception.getMessage());
      }
    }
  }

  @Scheduled(cron = "${finance.subscriptions.reminder-cron:0 0 8 * * *}")
  public void remindRenewals() {
    LocalDate today = SubscriptionBillingService.today();
    for (Subscription subscription : subscriptionRepository.findAllByStatus(SubscriptionStatus.ACTIVE)) {
      try {
        billingService.remindIfDue(subscription, today);
      } catch (Exception exception) {
        log.warn("Subscription reminder failed for {} ({}): {}", subscription.getId(), subscription.getName(), exception.getMessage());
      }
    }
  }
}
