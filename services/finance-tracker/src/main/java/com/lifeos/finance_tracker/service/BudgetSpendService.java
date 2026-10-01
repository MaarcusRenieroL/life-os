package com.lifeos.finance_tracker.service;

import com.lifeos.common.events.AuditEventPublisher;
import com.lifeos.common.events.AuditEventType;
import com.lifeos.finance_tracker.domains.entity.Budget;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.entity.UserFinanceSettings;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.repository.BudgetRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.lifeos.finance_tracker.repository.UserFinanceSettingsRepository;
import com.lifeos.finance_tracker.util.PayCycle;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Budget spend, read from the transactions themselves. This used to be a Redis counter bumped on
 * every new expense, which was volatile, only ever went up (so edits, deletes, merged duplicates and
 * recategorisation never lowered it) and missed anything categorised by hand - so alerts and the
 * "Today" screen could disagree with the Budgets page. Now there is one definition of "spent":
 * the counted debits in the budget's current period (see {@link TransactionRepository}).
 */
@Service
@RequiredArgsConstructor
public class BudgetSpendService {

  private final BudgetRepository budgetRepository;
  private final TransactionRepository transactionRepository;
  private final UserFinanceSettingsRepository settingsRepository;
  private final AuditEventPublisher auditEventPublisher;

  /** What a budget's period looks like around {@code at}. */
  public record Period(Instant start, Instant end, String key) {}

  public int payCycleStartDay(UUID userId) {
    return settingsRepository.findById(userId).map(UserFinanceSettings::getPayCycleStartDay).orElse(1);
  }

  /** The period a budget is measured over at a given moment. */
  public Period periodFor(Budget budget, Instant at) {
    switch (budget.getPeriod()) {
      case CUSTOM:
        if (budget.getStartDate() != null && budget.getEndDate() != null) {
          return new Period(budget.getStartDate(), budget.getEndDate(), budget.getStartDate().toString());
        }
        break;
      case YEARLY:
        {
          int year = at.atZone(PayCycle.ZONE).getYear();
          Instant start = java.time.LocalDate.of(year, 1, 1).atStartOfDay(PayCycle.ZONE).toInstant();
          Instant end = java.time.LocalDate.of(year + 1, 1, 1).atStartOfDay(PayCycle.ZONE).toInstant().minusMillis(1);
          return new Period(start, end, "Y" + year);
        }
      default:
        break;
    }
    PayCycle.Window window = PayCycle.containing(at, payCycleStartDay(budget.getUserId()));
    return new Period(window.start(), window.end(), window.key());
  }

  /** Spent so far in the budget's current period; zero when the category has no budget. */
  public BigDecimal getCurrentSpend(UUID userId, UUID categoryId) {
    Budget budget = budgetRepository.findByUserIdAndCategoryId(userId, categoryId);
    if (budget == null) {
      return BigDecimal.ZERO;
    }
    return spendIn(budget, periodFor(budget, Instant.now()));
  }

  public BigDecimal spendIn(Budget budget, Period period) {
    return transactionRepository.sumCategorySpendByPeriod(
        budget.getUserId(), budget.getCategoryId(), period.start(), period.end());
  }

  /**
   * Re-checks the budget a transaction counts toward and fires its threshold alert - once per
   * period, however many transactions land after the threshold is crossed. If edits or deletes
   * bring spend back under the threshold the alert is re-armed.
   */
  public void evaluate(Transaction transaction) {
    if (transaction.getType() != TransactionType.DEBIT || transaction.getCategoryId() == null) {
      return;
    }
    evaluate(transaction.getUserId(), transaction.getCategoryId(), transaction.getTransactionDate());
  }

  public void evaluate(UUID userId, UUID categoryId, Instant at) {
    Budget budget = budgetRepository.findByUserIdAndCategoryId(userId, categoryId);
    if (budget == null || !budget.isAlertEnabled() || budget.getBudgetAmount() == null || budget.getBudgetAmount().signum() <= 0) {
      return;
    }

    Period period = periodFor(budget, at);
    BigDecimal spend = spendIn(budget, period);
    BigDecimal percent = spend.divide(budget.getBudgetAmount(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
    boolean over = percent.compareTo(BigDecimal.valueOf(budget.getAlertThreshold())) >= 0;
    boolean alreadyAlerted = period.key().equals(budget.getLastAlertCycle());

    if (over && !alreadyAlerted) {
      auditEventPublisher.publish(
          userId,
          AuditEventType.BUDGET_EXCEEDED,
          "Budget alert threshold reached for category: " + categoryId,
          Map.of(
              "categoryId", categoryId.toString(),
              "budgetAmount", budget.getBudgetAmount().toString(),
              "currentSpend", spend.toString(),
              "percentSpent", percent.toString()));
      budget.setLastAlertCycle(period.key());
      budgetRepository.save(budget);
    } else if (!over && alreadyAlerted) {
      budget.setLastAlertCycle(null);
      budgetRepository.save(budget);
    }
  }
}
