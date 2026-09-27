package com.lifeos.finance_tracker.service;

import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.finance_tracker.domains.entity.Budget;
import com.lifeos.finance_tracker.domains.entity.RecurringPattern;
import com.lifeos.finance_tracker.repository.BudgetRepository;
import com.lifeos.finance_tracker.repository.RecurringPatternRepository;
import com.lifeos.finance_tracker.scheduler.FinanceAttentionScanner;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Backs the internal {@code GET /v1/finance/internal/today} endpoint core calls on page load to
 * build its cross-module Today view. Deliberately lean: it reuses the same tracked data
 * {@link com.lifeos.finance_tracker.scheduler.FinanceAttentionScanner} scans daily (recurring
 * patterns' {@code nextExpectedDate}, and BudgetSpendService's already-maintained Redis spend
 * counter) rather than recomputing any aggregate from transactions.
 */
@Service
@RequiredArgsConstructor
public class FinanceTodayService {

  private static final int BILL_DUE_LOOKAHEAD_DAYS = 3;
  private static final BigDecimal URGENT_OVERSPEND_PERCENT = BigDecimal.valueOf(150);

  private final RecurringPatternRepository recurringPatternRepository;
  private final BudgetRepository budgetRepository;
  private final BudgetSpendService budgetSpendService;

  public List<TodayItemResponse> getToday(UUID userId) {
    List<TodayItemResponse> items = new ArrayList<>();
    items.addAll(billsDueSoon(userId));
    items.addAll(budgetsOverLimit(userId));

    return items;
  }

  private List<TodayItemResponse> billsDueSoon(UUID userId) {
    Instant now = Instant.now();
    Instant cutoff = now.plus(Duration.ofDays(BILL_DUE_LOOKAHEAD_DAYS));

    return recurringPatternRepository.findAllByUserId(userId).stream()
        .filter(
            pattern ->
                pattern.getNextExpectedDate() != null
                    && !pattern.getNextExpectedDate().isBefore(now)
                    && !pattern.getNextExpectedDate().isAfter(cutoff))
        .map(this::toBillDueItem)
        .toList();
  }

  private TodayItemResponse toBillDueItem(RecurringPattern pattern) {
    String merchant =
        pattern.getMerchantKey() != null && !pattern.getMerchantKey().isBlank()
            ? pattern.getMerchantKey()
            : "Recurring";

    return TodayItemResponse.builder()
        .module("finance")
        .type("bill_due")
        .title(merchant + " bill due")
        .description("~$" + FinanceAttentionScanner.formatAmount(pattern.getAverageAmount()) + " expected")
        .dueAt(pattern.getNextExpectedDate())
        .entityId(pattern.getId().toString())
        .priority("info")
        .build();
  }

  private List<TodayItemResponse> budgetsOverLimit(UUID userId) {
    List<TodayItemResponse> items = new ArrayList<>();

    for (Budget budget : budgetRepository.findAllByUserId(userId)) {
      if (budget.getCategoryId() == null) {
        continue;
      }

      BigDecimal currentSpend = budgetSpendService.getCurrentSpend(userId, budget.getCategoryId());
      if (currentSpend.compareTo(budget.getBudgetAmount()) < 0) {
        continue;
      }

      items.add(toBudgetAlertItem(budget, currentSpend));
    }

    return items;
  }

  private TodayItemResponse toBudgetAlertItem(Budget budget, BigDecimal currentSpend) {
    BigDecimal percentSpent = FinanceAttentionScanner.percentOf(currentSpend, budget.getBudgetAmount());
    String priority = percentSpent.compareTo(URGENT_OVERSPEND_PERCENT) >= 0 ? "urgent" : "warning";

    return TodayItemResponse.builder()
        .module("finance")
        .type("budget_alert")
        .title("Budget exceeded")
        .description(
            "Spent $"
                + FinanceAttentionScanner.formatAmount(currentSpend)
                + " of $"
                + FinanceAttentionScanner.formatAmount(budget.getBudgetAmount())
                + " budgeted")
        .dueAt(null)
        .entityId(budget.getId().toString())
        .priority(priority)
        .build();
  }
}
