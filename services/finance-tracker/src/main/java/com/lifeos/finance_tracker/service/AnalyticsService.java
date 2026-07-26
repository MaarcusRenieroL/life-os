package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.record.CategoryComparison;
import com.lifeos.finance_tracker.domains.record.DashboardSummary;
import com.lifeos.finance_tracker.domains.record.MerchantSpend;
import com.lifeos.finance_tracker.domains.record.MonthlyTrend;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

  private final TransactionRepository transactionRepository;
  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Kolkata");

  public DashboardSummary getDashboardSummary(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    ZonedDateTime now = ZonedDateTime.now(ZONE_ID);
    Instant start = now.withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE_ID).toInstant();

    Instant end = now.toLocalDate().plusDays(1).atStartOfDay(ZONE_ID).toInstant();

    return transactionRepository.getDashboardSummary(userId, start, end);
  }

  public CategoryComparison getCategoryAnalytics(Authentication authentication, UUID categoryId) {
    UUID userId = (UUID) authentication.getPrincipal();
    ZonedDateTime now = ZonedDateTime.now(ZONE_ID);

    Instant startThisMonth = now.withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE_ID).toInstant();
    Instant endThisMonth = now.toLocalDate().plusDays(1).atStartOfDay(ZONE_ID).toInstant();

    ZonedDateTime lastMonth = now.minusMonths(1);
    Instant startLastMonth =
        lastMonth.withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE_ID).toInstant();
    Instant endLastMonth =
        lastMonth
            .withDayOfMonth(lastMonth.toLocalDate().lengthOfMonth())
            .toLocalDate()
            .plusDays(1)
            .atStartOfDay(ZONE_ID)
            .toInstant();

    BigDecimal currentMonthSpend =
        transactionRepository.sumCategorySpendByPeriod(
            userId, categoryId, startThisMonth, endThisMonth);
    BigDecimal lastMonthSpend =
        transactionRepository.sumCategorySpendByPeriod(
            userId, categoryId, startLastMonth, endLastMonth);

    BigDecimal difference = currentMonthSpend.subtract(lastMonthSpend);
    BigDecimal percentageChange = BigDecimal.ZERO;

    if (lastMonthSpend.compareTo(BigDecimal.ZERO) > 0) {
      percentageChange =
          difference
              .divide(lastMonthSpend, 4, RoundingMode.HALF_UP)
              .multiply(BigDecimal.valueOf(100));
    }

    return new CategoryComparison(
        categoryId, currentMonthSpend, lastMonthSpend, difference, percentageChange);
  }

  public List<MonthlyTrend> getMonthlyTrends(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    Instant since =
        ZonedDateTime.now(ZONE_ID)
            .minusMonths(11)
            .withDayOfMonth(1)
            .toLocalDate()
            .atStartOfDay(ZONE_ID)
            .toInstant();
    List<Object[]> rawTrends = transactionRepository.getMonthlyTrendsRaw(userId, since);

    List<MonthlyTrend> trends = new ArrayList<>();
    for (Object[] row : rawTrends) {
      trends.add(new MonthlyTrend((String) row[0], (BigDecimal) row[1]));
    }
    return trends;
  }

  public List<MerchantSpend> getTopMerchants(Authentication authentication, int limit) {
    UUID userId = (UUID) authentication.getPrincipal();
    List<Object[]> rawMerchants = transactionRepository.getTopMerchantsRaw(userId, limit);

    List<MerchantSpend> merchants = new ArrayList<>();
    for (Object[] row : rawMerchants) {
      merchants.add(new MerchantSpend((String) row[0], (BigDecimal) row[1]));
    }
    return merchants;
  }
}
