package com.lifeos.finance_tracker.scheduler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.finance_tracker.domains.entity.Budget;
import com.lifeos.finance_tracker.domains.entity.RecurringPattern;
import com.lifeos.finance_tracker.domains.enums.RecurringFrequency;
import com.lifeos.finance_tracker.repository.BudgetRepository;
import com.lifeos.finance_tracker.repository.RecurringPatternRepository;
import com.lifeos.finance_tracker.service.BudgetSpendService;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class FinanceAttentionScannerTest {

  @Mock private RecurringPatternRepository recurringPatternRepository;
  @Mock private BudgetRepository budgetRepository;
  @Mock private BudgetSpendService budgetSpendService;
  @Mock private NotificationEventPublisher notificationEventPublisher;
  @Mock private StringRedisTemplate stringRedisTemplate;
  @Mock private ValueOperations<String, String> valueOperations;

  @InjectMocks private FinanceAttentionScanner scanner;

  private final UUID ownerUserId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    ReflectionTestUtils.setField(scanner, "ownerUserId", ownerUserId.toString());
    lenient().when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
  }

  @Test
  void publishesBillDueNotificationWhenNotAlreadyClaimed() {
    RecurringPattern pattern =
        RecurringPattern.builder()
            .id(UUID.randomUUID())
            .userId(ownerUserId)
            .merchantKey("netflix")
            .averageAmount(new BigDecimal("15.99"))
            .frequency(RecurringFrequency.MONTHLY)
            .nextExpectedDate(Instant.now().plus(Duration.ofDays(2)))
            .build();

    when(recurringPatternRepository.findAllByUserId(ownerUserId)).thenReturn(List.of(pattern));
    when(budgetRepository.findAllByUserId(ownerUserId)).thenReturn(List.of());
    when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(true);

    scanner.scan();

    verify(notificationEventPublisher)
        .publish(
            eq(ownerUserId),
            eq(NotificationEventType.FINANCE_RECURRING_BILL_DUE),
            anyString(),
            anyString(),
            any());
  }

  @Test
  void skipsBillDueNotificationWhenAlreadyClaimedThisWindow() {
    RecurringPattern pattern =
        RecurringPattern.builder()
            .id(UUID.randomUUID())
            .userId(ownerUserId)
            .merchantKey("netflix")
            .averageAmount(new BigDecimal("15.99"))
            .nextExpectedDate(Instant.now().plus(Duration.ofDays(2)))
            .build();

    when(recurringPatternRepository.findAllByUserId(ownerUserId)).thenReturn(List.of(pattern));
    when(budgetRepository.findAllByUserId(ownerUserId)).thenReturn(List.of());
    when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(false);

    scanner.scan();

    verify(notificationEventPublisher, never())
        .publish(any(), eq(NotificationEventType.FINANCE_RECURRING_BILL_DUE), anyString(), anyString(), any());
  }

  @Test
  void skipsBillOutsideTheLookaheadWindow() {
    RecurringPattern pattern =
        RecurringPattern.builder()
            .id(UUID.randomUUID())
            .userId(ownerUserId)
            .merchantKey("landlord")
            .averageAmount(new BigDecimal("1200.00"))
            .nextExpectedDate(Instant.now().plus(Duration.ofDays(10)))
            .build();

    when(recurringPatternRepository.findAllByUserId(ownerUserId)).thenReturn(List.of(pattern));
    when(budgetRepository.findAllByUserId(ownerUserId)).thenReturn(List.of());

    scanner.scan();

    verify(notificationEventPublisher, never())
        .publish(any(), eq(NotificationEventType.FINANCE_RECURRING_BILL_DUE), anyString(), anyString(), any());
  }

  @Test
  void publishesBudgetExceededWhenSpendCrossesLimitAndNotYetClaimed() {
    UUID categoryId = UUID.randomUUID();
    Budget budget =
        Budget.builder()
            .id(UUID.randomUUID())
            .userId(ownerUserId)
            .categoryId(categoryId)
            .budgetAmount(new BigDecimal("500.00"))
            .build();

    when(recurringPatternRepository.findAllByUserId(ownerUserId)).thenReturn(List.of());
    when(budgetRepository.findAllByUserId(ownerUserId)).thenReturn(List.of(budget));
    when(budgetSpendService.getCurrentSpend(ownerUserId, categoryId)).thenReturn(new BigDecimal("600.00"));
    when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(true);

    scanner.scan();

    verify(notificationEventPublisher)
        .publish(
            eq(ownerUserId),
            eq(NotificationEventType.FINANCE_BUDGET_EXCEEDED),
            anyString(),
            anyString(),
            any());
  }

  @Test
  void skipsBudgetExceededWhenUnderLimit() {
    UUID categoryId = UUID.randomUUID();
    Budget budget =
        Budget.builder()
            .id(UUID.randomUUID())
            .userId(ownerUserId)
            .categoryId(categoryId)
            .budgetAmount(new BigDecimal("500.00"))
            .build();

    when(recurringPatternRepository.findAllByUserId(ownerUserId)).thenReturn(List.of());
    when(budgetRepository.findAllByUserId(ownerUserId)).thenReturn(List.of(budget));
    when(budgetSpendService.getCurrentSpend(ownerUserId, categoryId)).thenReturn(new BigDecimal("100.00"));

    scanner.scan();

    verify(notificationEventPublisher, never())
        .publish(any(), eq(NotificationEventType.FINANCE_BUDGET_EXCEEDED), anyString(), anyString(), any());
  }

  @Test
  void skipsBudgetExceededWhenAlreadyClaimedThisMonth() {
    UUID categoryId = UUID.randomUUID();
    Budget budget =
        Budget.builder()
            .id(UUID.randomUUID())
            .userId(ownerUserId)
            .categoryId(categoryId)
            .budgetAmount(new BigDecimal("500.00"))
            .build();

    when(recurringPatternRepository.findAllByUserId(ownerUserId)).thenReturn(List.of());
    when(budgetRepository.findAllByUserId(ownerUserId)).thenReturn(List.of(budget));
    when(budgetSpendService.getCurrentSpend(ownerUserId, categoryId)).thenReturn(new BigDecimal("600.00"));
    when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(false);

    scanner.scan();

    verify(notificationEventPublisher, never())
        .publish(any(), eq(NotificationEventType.FINANCE_BUDGET_EXCEEDED), anyString(), anyString(), any());
  }

  @Test
  void percentOfComputesPercentage() {
    assertThat(FinanceAttentionScanner.percentOf(new BigDecimal("150"), new BigDecimal("100")))
        .isEqualByComparingTo("150.0000");
  }

  @Test
  void formatAmountHandlesNull() {
    assertThat(FinanceAttentionScanner.formatAmount(null)).isEqualTo("0");
  }
}
