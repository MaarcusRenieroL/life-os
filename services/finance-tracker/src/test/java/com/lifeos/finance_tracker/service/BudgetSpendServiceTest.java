package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.AuditEventPublisher;
import com.lifeos.common.events.AuditEventType;
import com.lifeos.finance_tracker.domains.entity.Budget;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.entity.UserFinanceSettings;
import com.lifeos.finance_tracker.domains.enums.BudgetPeriod;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.repository.BudgetRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.lifeos.finance_tracker.repository.UserFinanceSettingsRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BudgetSpendServiceTest {

  @Mock private BudgetRepository budgetRepository;
  @Mock private TransactionRepository transactionRepository;
  @Mock private UserFinanceSettingsRepository settingsRepository;
  @Mock private AuditEventPublisher auditEventPublisher;
  @InjectMocks private BudgetSpendService service;

  private final UUID userId = UUID.randomUUID();
  private final UUID categoryId = UUID.randomUUID();
  private final Instant now = Instant.parse("2026-10-10T06:00:00Z");
  private Budget budget;

  @BeforeEach
  void setUp() {
    budget = Budget.builder().id(UUID.randomUUID()).userId(userId).categoryId(categoryId).budgetAmount(new BigDecimal("10000")).period(BudgetPeriod.MONTHLY).alertThreshold(80).alertEnabled(true).build();
    lenient().when(budgetRepository.findByUserIdAndCategoryId(userId, categoryId)).thenReturn(budget);
    lenient().when(settingsRepository.findById(userId)).thenReturn(Optional.empty());
  }

  private void spendIs(String amount) {
    when(transactionRepository.sumCategorySpendByPeriod(eq(userId), eq(categoryId), any(), any())).thenReturn(new BigDecimal(amount));
  }

  private Transaction expense() {
    return Transaction.builder().userId(userId).categoryId(categoryId).type(TransactionType.DEBIT).amount(new BigDecimal("500")).transactionDate(now).build();
  }

  @Test
  void crossingTheThresholdFiresTheAlertOnce() {
    spendIs("8500");

    service.evaluate(expense());

    verify(auditEventPublisher).publish(eq(userId), eq(AuditEventType.BUDGET_EXCEEDED), anyString(), anyMap());
    assertThat(budget.getLastAlertCycle()).isEqualTo("2026-10-01");
  }

  @Test
  void furtherExpensesInTheSamePeriodDoNotRepeatTheAlert() {
    spendIs("9200");
    budget.setLastAlertCycle("2026-10-01");

    service.evaluate(expense());
    service.evaluate(expense());

    verify(auditEventPublisher, never()).publish(any(), any(), anyString(), anyMap());
  }

  @Test
  void aNewPeriodAlertsAgain() {
    spendIs("8500");
    budget.setLastAlertCycle("2026-09-01");

    service.evaluate(expense());

    verify(auditEventPublisher, times(1)).publish(eq(userId), eq(AuditEventType.BUDGET_EXCEEDED), anyString(), anyMap());
    assertThat(budget.getLastAlertCycle()).isEqualTo("2026-10-01");
  }

  @Test
  void deletingOrEditingSpendBackUnderTheThresholdRearmsTheAlert() {
    spendIs("3000");
    budget.setLastAlertCycle("2026-10-01");

    service.evaluate(expense());

    assertThat(budget.getLastAlertCycle()).isNull();
    verify(budgetRepository).save(budget);
  }

  @Test
  void spendUnderTheThresholdDoesNothing() {
    spendIs("1000");

    service.evaluate(expense());

    verify(auditEventPublisher, never()).publish(any(), any(), anyString(), anyMap());
    verify(budgetRepository, never()).save(any());
  }

  @Test
  void creditsUncategorisedAndUnbudgetedTransactionsAreIgnored() {
    Transaction credit = expense();
    credit.setType(TransactionType.CREDIT);
    Transaction uncategorised = expense();
    uncategorised.setCategoryId(null);

    service.evaluate(credit);
    service.evaluate(uncategorised);
    service.evaluate(userId, UUID.randomUUID(), now);

    verify(transactionRepository, never()).sumCategorySpendByPeriod(any(), any(), any(), any());
  }

  @Test
  void aBudgetWithAlertsOffNeverQueriesSpend() {
    budget.setAlertEnabled(false);

    service.evaluate(expense());

    verify(transactionRepository, never()).sumCategorySpendByPeriod(any(), any(), any(), any());
  }

  @Test
  void theMonthlyPeriodFollowsThePayCycle() {
    UserFinanceSettings settings = UserFinanceSettings.builder().userId(userId).payCycleStartDay(25).build();
    when(settingsRepository.findById(userId)).thenReturn(Optional.of(settings));

    BudgetSpendService.Period period = service.periodFor(budget, now);

    assertThat(period.key()).isEqualTo("2026-09-25");
  }

  @Test
  void yearlyAndCustomBudgetsUseTheirOwnWindows() {
    budget.setPeriod(BudgetPeriod.YEARLY);
    assertThat(service.periodFor(budget, now).key()).isEqualTo("Y2026");

    budget.setPeriod(BudgetPeriod.CUSTOM);
    budget.setStartDate(Instant.parse("2026-10-05T00:00:00Z"));
    budget.setEndDate(Instant.parse("2026-10-20T00:00:00Z"));
    BudgetSpendService.Period custom = service.periodFor(budget, now);
    assertThat(custom.start()).isEqualTo(budget.getStartDate());
    assertThat(custom.end()).isEqualTo(budget.getEndDate());
  }
}
