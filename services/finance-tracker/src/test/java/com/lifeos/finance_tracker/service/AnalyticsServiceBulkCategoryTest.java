package com.lifeos.finance_tracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.lifeos.finance_tracker.domains.record.CategoryComparison;
import com.lifeos.finance_tracker.domains.record.CategoryPeriodSpend;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.lifeos.finance_tracker.repository.UserFinanceSettingsRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;

/**
 * Covers the aggregate category-comparison endpoint that replaced the frontend's per-category
 * fan-out (up to ~20 requests per page across four pages).
 */
@ExtendWith(MockitoExtension.class)
class AnalyticsServiceBulkCategoryTest {

  @Mock private TransactionRepository transactionRepository;
  @Mock private UserFinanceSettingsRepository userFinanceSettingsRepository;
  @Mock private ObjectProvider<AnalyticsService> self;
  @Mock private Authentication authentication;

  private AnalyticsService analyticsService;

  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    analyticsService =
        new AnalyticsService(transactionRepository, userFinanceSettingsRepository, self);
  }

  private void authenticated() {
    when(authentication.getPrincipal()).thenReturn(userId);
  }

  @Test
  void returnsOneComparisonPerRequestedCategoryInRequestOrder() {
    authenticated();
    UUID groceries = UUID.randomUUID();
    UUID transport = UUID.randomUUID();

    when(transactionRepository.sumCategorySpendForPeriods(
            eq(userId), anyList(), any(), any(), any(), any()))
        .thenReturn(
            List.of(
                new CategoryPeriodSpend(transport, new BigDecimal("300"), new BigDecimal("100")),
                new CategoryPeriodSpend(groceries, new BigDecimal("500"), new BigDecimal("400"))));

    List<CategoryComparison> result =
        analyticsService.getCategoryAnalyticsBulk(authentication, List.of(groceries, transport));

    assertThat(result).extracting(CategoryComparison::categoryId).containsExactly(groceries, transport);
  }

  @Test
  void computesDifferenceAndPercentageChange() {
    authenticated();
    UUID groceries = UUID.randomUUID();

    when(transactionRepository.sumCategorySpendForPeriods(
            eq(userId), anyList(), any(), any(), any(), any()))
        .thenReturn(
            List.of(new CategoryPeriodSpend(groceries, new BigDecimal("500"), new BigDecimal("400"))));

    CategoryComparison comparison =
        analyticsService.getCategoryAnalyticsBulk(authentication, List.of(groceries)).getFirst();

    assertThat(comparison.currentMonthSpend()).isEqualByComparingTo("500");
    assertThat(comparison.lastMonthSpend()).isEqualByComparingTo("400");
    assertThat(comparison.difference()).isEqualByComparingTo("100");
    assertThat(comparison.percentageChange()).isEqualByComparingTo("25.00");
  }

  /** A category with no spend in either period produces no row, but callers index by id. */
  @Test
  void fillsZerosForCategoriesWithNoSpendRatherThanOmittingThem() {
    authenticated();
    UUID spent = UUID.randomUUID();
    UUID untouched = UUID.randomUUID();

    when(transactionRepository.sumCategorySpendForPeriods(
            eq(userId), anyList(), any(), any(), any(), any()))
        .thenReturn(
            List.of(new CategoryPeriodSpend(spent, new BigDecimal("50"), new BigDecimal("20"))));

    List<CategoryComparison> result =
        analyticsService.getCategoryAnalyticsBulk(authentication, List.of(spent, untouched));

    assertThat(result).hasSize(2);
    CategoryComparison zeroed =
        result.stream().filter(c -> c.categoryId().equals(untouched)).findFirst().orElseThrow();
    assertThat(zeroed.currentMonthSpend()).isEqualByComparingTo("0");
    assertThat(zeroed.lastMonthSpend()).isEqualByComparingTo("0");
    assertThat(zeroed.difference()).isEqualByComparingTo("0");
    assertThat(zeroed.percentageChange()).isEqualByComparingTo("0");
  }

  /** Zero previous spend would otherwise be a divide-by-zero in the percentage change. */
  @Test
  void reportsZeroPercentageChangeWhenThereWasNoPreviousSpend() {
    authenticated();
    UUID brandNew = UUID.randomUUID();

    when(transactionRepository.sumCategorySpendForPeriods(
            eq(userId), anyList(), any(), any(), any(), any()))
        .thenReturn(
            List.of(new CategoryPeriodSpend(brandNew, new BigDecimal("250"), BigDecimal.ZERO)));

    CategoryComparison comparison =
        analyticsService.getCategoryAnalyticsBulk(authentication, List.of(brandNew)).getFirst();

    assertThat(comparison.difference()).isEqualByComparingTo("250");
    assertThat(comparison.percentageChange()).isEqualByComparingTo("0");
  }

  @Test
  void queriesEachCategoryOnceEvenIfRequestedTwice() {
    authenticated();
    UUID groceries = UUID.randomUUID();

    when(transactionRepository.sumCategorySpendForPeriods(
            eq(userId), anyList(), any(), any(), any(), any()))
        .thenReturn(List.of());

    List<CategoryComparison> result =
        analyticsService.getCategoryAnalyticsBulk(
            authentication, List.of(groceries, groceries, groceries));

    assertThat(result).hasSize(1);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<Collection<UUID>> ids = ArgumentCaptor.forClass(Collection.class);
    verify(transactionRepository)
        .sumCategorySpendForPeriods(eq(userId), ids.capture(), any(), any(), any(), any());
    assertThat(ids.getValue()).containsExactly(groceries);
  }

  @Test
  void skipsTheQueryEntirelyForAnEmptyRequest() {
    List<CategoryComparison> result = analyticsService.getCategoryAnalyticsBulk(authentication, List.of());

    assertThat(result).isEmpty();
    verifyNoInteractions(transactionRepository);
  }

  @Test
  void treatsANullIdListAsEmpty() {
    assertThat(analyticsService.getCategoryAnalyticsBulk(authentication, null)).isEmpty();
    verify(transactionRepository, never())
        .sumCategorySpendForPeriods(any(), anyList(), any(), any(), any(), any());
  }

  /**
   * The two compared periods must be contiguous and ordered previous -> current, since the query's
   * outer range scan spans previousStart..currentEnd.
   */
  @Test
  void comparesThisMonthAgainstAContiguousPreviousMonth() {
    authenticated();
    UUID groceries = UUID.randomUUID();
    when(transactionRepository.sumCategorySpendForPeriods(
            eq(userId), anyList(), any(), any(), any(), any()))
        .thenReturn(List.of());

    analyticsService.getCategoryAnalyticsBulk(authentication, List.of(groceries));

    ArgumentCaptor<Instant> currentStart = ArgumentCaptor.forClass(Instant.class);
    ArgumentCaptor<Instant> currentEnd = ArgumentCaptor.forClass(Instant.class);
    ArgumentCaptor<Instant> previousStart = ArgumentCaptor.forClass(Instant.class);
    ArgumentCaptor<Instant> previousEnd = ArgumentCaptor.forClass(Instant.class);
    verify(transactionRepository)
        .sumCategorySpendForPeriods(
            eq(userId),
            anyList(),
            currentStart.capture(),
            currentEnd.capture(),
            previousStart.capture(),
            previousEnd.capture());

    assertThat(previousStart.getValue()).isBefore(previousEnd.getValue());
    assertThat(currentStart.getValue()).isBefore(currentEnd.getValue());
    // Last month's exclusive end is this month's start - no gap, no overlap.
    assertThat(previousEnd.getValue()).isEqualTo(currentStart.getValue());
  }
}
