package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.finance_tracker.domains.entity.Budget;
import com.lifeos.finance_tracker.domains.entity.RecurringPattern;
import com.lifeos.finance_tracker.repository.BudgetRepository;
import com.lifeos.finance_tracker.repository.RecurringPatternRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FinanceTodayServiceTest {

  @Mock private RecurringPatternRepository recurringPatternRepository;
  @Mock private BudgetRepository budgetRepository;
  @Mock private BudgetSpendService budgetSpendService;

  @InjectMocks private FinanceTodayService financeTodayService;

  private final UUID userId = UUID.randomUUID();

  @Test
  void includesRecurringPatternDueWithinLookaheadAsBillDueItem() {
    RecurringPattern pattern =
        RecurringPattern.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .merchantKey("spotify")
            .averageAmount(new BigDecimal("9.99"))
            .nextExpectedDate(Instant.now().plus(Duration.ofDays(1)))
            .build();

    when(recurringPatternRepository.findAllByUserId(userId)).thenReturn(List.of(pattern));
    when(budgetRepository.findAllByUserId(userId)).thenReturn(List.of());

    List<TodayItemResponse> items = financeTodayService.getToday(userId);

    assertThat(items).hasSize(1);
    TodayItemResponse item = items.get(0);
    assertThat(item.getModule()).isEqualTo("finance");
    assertThat(item.getType()).isEqualTo("bill_due");
    assertThat(item.getEntityId()).isEqualTo(pattern.getId().toString());
    assertThat(item.getTitle()).contains("spotify");
  }

  @Test
  void excludesRecurringPatternOutsideLookaheadWindow() {
    RecurringPattern pattern =
        RecurringPattern.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .merchantKey("landlord")
            .averageAmount(new BigDecimal("1200.00"))
            .nextExpectedDate(Instant.now().plus(Duration.ofDays(30)))
            .build();

    when(recurringPatternRepository.findAllByUserId(userId)).thenReturn(List.of(pattern));
    when(budgetRepository.findAllByUserId(userId)).thenReturn(List.of());

    assertThat(financeTodayService.getToday(userId)).isEmpty();
  }

  @Test
  void marksBudgetUrgentWhenWellOverLimit() {
    UUID categoryId = UUID.randomUUID();
    Budget budget =
        Budget.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .categoryId(categoryId)
            .budgetAmount(new BigDecimal("100.00"))
            .build();

    when(recurringPatternRepository.findAllByUserId(userId)).thenReturn(List.of());
    when(budgetRepository.findAllByUserId(userId)).thenReturn(List.of(budget));
    when(budgetSpendService.getCurrentSpend(userId, categoryId)).thenReturn(new BigDecimal("200.00"));

    List<TodayItemResponse> items = financeTodayService.getToday(userId);

    assertThat(items).hasSize(1);
    assertThat(items.get(0).getType()).isEqualTo("budget_alert");
    assertThat(items.get(0).getPriority()).isEqualTo("urgent");
  }

  @Test
  void marksBudgetWarningWhenJustOverLimit() {
    UUID categoryId = UUID.randomUUID();
    Budget budget =
        Budget.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .categoryId(categoryId)
            .budgetAmount(new BigDecimal("100.00"))
            .build();

    when(recurringPatternRepository.findAllByUserId(userId)).thenReturn(List.of());
    when(budgetRepository.findAllByUserId(userId)).thenReturn(List.of(budget));
    when(budgetSpendService.getCurrentSpend(userId, categoryId)).thenReturn(new BigDecimal("110.00"));

    assertThat(financeTodayService.getToday(userId).get(0).getPriority()).isEqualTo("warning");
  }

  @Test
  void excludesBudgetUnderLimit() {
    UUID categoryId = UUID.randomUUID();
    Budget budget =
        Budget.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .categoryId(categoryId)
            .budgetAmount(new BigDecimal("100.00"))
            .build();

    when(recurringPatternRepository.findAllByUserId(userId)).thenReturn(List.of());
    when(budgetRepository.findAllByUserId(userId)).thenReturn(List.of(budget));
    when(budgetSpendService.getCurrentSpend(userId, categoryId)).thenReturn(new BigDecimal("50.00"));

    assertThat(financeTodayService.getToday(userId)).isEmpty();
  }

  @Test
  void excludesBudgetWithoutCategory() {
    Budget budget =
        Budget.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .categoryId(null)
            .budgetAmount(new BigDecimal("100.00"))
            .build();

    when(recurringPatternRepository.findAllByUserId(userId)).thenReturn(List.of());
    when(budgetRepository.findAllByUserId(userId)).thenReturn(List.of(budget));

    assertThat(financeTodayService.getToday(userId)).isEmpty();
  }
}
