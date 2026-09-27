package com.lifeos.finance_tracker.scheduler;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.finance_tracker.domains.entity.Budget;
import com.lifeos.finance_tracker.domains.entity.RecurringPattern;
import com.lifeos.finance_tracker.repository.BudgetRepository;
import com.lifeos.finance_tracker.repository.RecurringPatternRepository;
import com.lifeos.finance_tracker.service.BudgetSpendService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily scan that surfaces two "you should look at this" conditions as in-app notifications: a
 * recurring bill coming due soon, and a budget that has crossed its limit.
 *
 * <p>This is distinct from {@link BudgetSpendService}'s real-time per-transaction threshold check
 * (which feeds the audit trail via {@code AuditEventType.BUDGET_EXCEEDED} and can fire on every
 * transaction past the threshold) - this scanner drives the user-facing notification bell, so it
 * needs its own once-per-condition dedup instead of nagging daily.
 *
 * <p>Scoped to {@code owner.user-id}, matching {@link RecurringDetectionScheduler} - finance-
 * tracker's scheduled jobs are written against the single owner this instance is deployed for,
 * not a cross-tenant sweep.
 */
@Component
@RequiredArgsConstructor
public class FinanceAttentionScanner {

  private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
  private static final int BILL_DUE_LOOKAHEAD_DAYS = 3;
  private static final BigDecimal URGENT_OVERSPEND_PERCENT = BigDecimal.valueOf(150);

  @Value("${owner.user-id}")
  private String ownerUserId;

  private final RecurringPatternRepository recurringPatternRepository;
  private final BudgetRepository budgetRepository;
  private final BudgetSpendService budgetSpendService;
  private final NotificationEventPublisher notificationEventPublisher;
  private final StringRedisTemplate stringRedisTemplate;

  @Scheduled(cron = "${finance.attention-scan.cron:0 0 8 * * *}")
  public void scan() {
    UUID userId = UUID.fromString(ownerUserId);

    scanRecurringBills(userId);
    scanBudgets(userId);
  }

  private void scanRecurringBills(UUID userId) {
    Instant now = Instant.now();
    Instant cutoff = now.plus(Duration.ofDays(BILL_DUE_LOOKAHEAD_DAYS));

    for (RecurringPattern pattern : recurringPatternRepository.findAllByUserId(userId)) {
      Instant nextExpectedDate = pattern.getNextExpectedDate();
      if (nextExpectedDate == null
          || nextExpectedDate.isBefore(now)
          || nextExpectedDate.isAfter(cutoff)) {
        continue;
      }

      // Claimed per (pattern, due date) rather than per (pattern, day-of-window) - fires exactly
      // once for a given upcoming due date no matter which day within the 3-day lookahead the
      // scanner happens to catch it on (resilient to a missed/delayed run), and the TTL clears
      // itself out once the pattern rolls its nextExpectedDate forward past this bill.
      if (!claim("bill-due:" + pattern.getId() + ":" + nextExpectedDate, Duration.ofDays(10))) {
        continue;
      }

      long daysUntilDue = Duration.between(now, nextExpectedDate).toDays();
      String merchant =
          pattern.getMerchantKey() != null && !pattern.getMerchantKey().isBlank()
              ? pattern.getMerchantKey()
              : "A recurring";
      String dueIn = daysUntilDue <= 0 ? "today" : "in " + daysUntilDue + " day" + (daysUntilDue == 1 ? "" : "s");

      notificationEventPublisher.publish(
          userId,
          NotificationEventType.FINANCE_RECURRING_BILL_DUE,
          merchant + " bill (~$" + formatAmount(pattern.getAverageAmount()) + ") due " + dueIn,
          "Expected around " + LocalDate.ofInstant(nextExpectedDate, ZONE),
          Map.of(
              "recurringPatternId", pattern.getId().toString(),
              "nextExpectedDate", nextExpectedDate.toString(),
              "averageAmount", String.valueOf(pattern.getAverageAmount())));
    }
  }

  private void scanBudgets(UUID userId) {
    for (Budget budget : budgetRepository.findAllByUserId(userId)) {
      if (budget.getCategoryId() == null) {
        continue;
      }

      BigDecimal currentSpend = budgetSpendService.getCurrentSpend(userId, budget.getCategoryId());
      if (currentSpend.compareTo(budget.getBudgetAmount()) < 0) {
        continue;
      }

      // Claimed per (budget, month) - fires only the day the budget FIRST crosses its limit, not
      // every subsequent day it stays over, and resets naturally next month via the TTL.
      YearMonth thisMonth = YearMonth.now(ZONE);
      if (!claim("budget-exceeded:" + budget.getId() + ":" + thisMonth, Duration.ofDays(45))) {
        continue;
      }

      BigDecimal percentSpent = percentOf(currentSpend, budget.getBudgetAmount());
      String priority =
          percentSpent.compareTo(URGENT_OVERSPEND_PERCENT) >= 0 ? "urgent" : "warning";

      notificationEventPublisher.publish(
          userId,
          NotificationEventType.FINANCE_BUDGET_EXCEEDED,
          "Budget exceeded for one of your categories",
          "Spent $" + formatAmount(currentSpend) + " of $" + formatAmount(budget.getBudgetAmount()) + " budgeted",
          Map.of(
              "budgetId", budget.getId().toString(),
              "categoryId", budget.getCategoryId().toString(),
              "currentSpend", currentSpend.toString(),
              "budgetAmount", budget.getBudgetAmount().toString(),
              "priority", priority));
    }
  }

  /** Redis SETNX-based at-most-once claim: true the first time this key is claimed, false on
   * every call after that until the TTL expires. */
  private boolean claim(String suffix, Duration ttl) {
    Boolean firstClaim =
        stringRedisTemplate.opsForValue().setIfAbsent("finance:attention-notified:" + suffix, "1", ttl);

    return Boolean.TRUE.equals(firstClaim);
  }

  public static BigDecimal percentOf(BigDecimal value, BigDecimal of) {
    return value.divide(of, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
  }

  public static String formatAmount(BigDecimal amount) {
    return amount == null ? "0" : amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
  }
}
