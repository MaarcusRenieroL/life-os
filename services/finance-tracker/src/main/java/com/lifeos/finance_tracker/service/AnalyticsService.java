package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.UpdateMonthlyIncomeRequest;
import com.lifeos.finance_tracker.domains.entity.UserFinanceSettings;
import com.lifeos.finance_tracker.domains.record.CategoryComparison;
import com.lifeos.finance_tracker.domains.record.DashboardSummary;
import com.lifeos.finance_tracker.domains.record.MerchantSpend;
import com.lifeos.finance_tracker.domains.record.MonthlyTrend;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.lifeos.finance_tracker.repository.UserFinanceSettingsRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Kolkata");

  private final TransactionRepository transactionRepository;
  private final UserFinanceSettingsRepository userFinanceSettingsRepository;

  // Self-injected via ObjectProvider (lazy, so it doesn't create a circular-construction
  // problem) so that the call below to computeDashboardSummary goes back through the Spring
  // proxy instead of a bare `this` call - a same-class method call bypasses the proxy and
  // silently skips @Cacheable. Only the cacheable "sum over transactions" part is cached; the
  // fixed-income setting is merged in fresh on every call (see the comment below), so caching
  // the whole method would have frozen the income figure at whatever it was on the first
  // request after a cache miss.
  private final ObjectProvider<AnalyticsService> self;

  public DashboardSummary getDashboardSummary(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    DashboardSummary result = self.getObject().computeDashboardSummary(userId);

    // Fixed income is a user setting, not derived from transactions - always
    // read fresh (a single PK lookup, not worth caching) rather than letting
    // it go stale for up to the cache TTL after the user changes it.
    BigDecimal fixedMonthlyIncome =
        userFinanceSettingsRepository
            .findById(userId)
            .map(UserFinanceSettings::getMonthlyIncome)
            .orElse(null);

    return new DashboardSummary(result.totalIncome(), result.totalExpenses(), fixedMonthlyIncome);
  }

  // Cache key mirrors the original hand-rolled Redis key shape (userId + current YearMonth) so a
  // cached entry still naturally separates across a month boundary rather than serving last
  // month's totals into the new month for up to a full TTL.
  @Cacheable(
      value = "finance-analytics-dashboard",
      key = "#userId + ':' + T(java.time.YearMonth).now(T(java.time.ZoneId).of('Asia/Kolkata'))")
  public DashboardSummary computeDashboardSummary(UUID userId) {
    ZonedDateTime now = ZonedDateTime.now(ZONE_ID);
    Instant start = now.withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE_ID).toInstant();
    Instant end = now.toLocalDate().plusDays(1).atStartOfDay(ZONE_ID).toInstant();

    return transactionRepository.getDashboardSummary(userId, start, end);
  }

  public DashboardSummary updateMonthlyIncome(
      Authentication authentication, UpdateMonthlyIncomeRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    UserFinanceSettings settings =
        userFinanceSettingsRepository
            .findById(userId)
            .orElseGet(() -> UserFinanceSettings.builder().userId(userId).build());

    settings.setMonthlyIncome(request.getMonthlyIncome());
    userFinanceSettingsRepository.save(settings);

    return getDashboardSummary(authentication);
  }

  @Cacheable(value = "finance-analytics-category", key = "#authentication.principal + ':' + #categoryId")
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

  @Cacheable(value = "finance-analytics-trends", key = "#authentication.principal")
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

  @Cacheable(value = "finance-analytics-merchants", key = "#authentication.principal + ':' + #limit")
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
