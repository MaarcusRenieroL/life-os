package com.lifeos.finance_tracker.service;

import com.lifeos.common.events.AuditEventType;
import com.lifeos.finance_tracker.domains.entity.Budget;
import com.lifeos.finance_tracker.publisher.AuditEventPublisher;
import com.lifeos.finance_tracker.repository.BudgetRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BudgetSpendService {

  private final StringRedisTemplate stringRedisTemplate;
  private final BudgetRepository budgetRepository;
  private final AuditEventPublisher auditEventPublisher;

  public void recordSpend(
      UUID userId, UUID categoryId, BigDecimal amount, Instant transactionDate) {
    if (categoryId == null) {
      return;
    }

    String key =
        "spend:"
            + userId
            + ":"
            + categoryId
            + ":"
            + YearMonth.from(transactionDate.atZone(ZoneId.of("Asia/Kolkata")));

    stringRedisTemplate.opsForValue().increment(key, amount.doubleValue());

    // Always refresh the TTL rather than only setting it on the "first"
    // write (which was previously detected via a fragile floating-point
    // equality check) - EXPIRE just resets the countdown regardless of
    // whether the key already existed, so this is simpler and correct.
    // 45 days (not ~30) so the key survives past month-end for reconciliation.
    stringRedisTemplate.expire(key, Duration.ofDays(45));

    Budget budget = budgetRepository.findByUserIdAndCategoryId(userId, categoryId);

    if (budget == null) {
      return;
    }

    String currentSpendStr = stringRedisTemplate.opsForValue().get(key);

    if (currentSpendStr == null) {
      return;
    }

    BigDecimal currentSpendDecimal = new BigDecimal(currentSpendStr);

    BigDecimal percentSpent =
        currentSpendDecimal
            .divide(budget.getBudgetAmount(), 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));

    if (percentSpent.compareTo(new BigDecimal(budget.getAlertThreshold())) >= 0
        && budget.isAlertEnabled()) {
      Map<String, String> metadata =
          Map.of(
              "categoryId",
              categoryId.toString(),
              "budgetAmount",
              budget.getBudgetAmount().toString(),
              "currentSpend",
              currentSpendDecimal.toString(),
              "percentSpent",
              percentSpent.toString());

      auditEventPublisher.publish(
          userId,
          AuditEventType.BUDGET_EXCEEDED,
          "Budget alert threshold reached for category: " + categoryId,
          metadata);
    }
  }
}
