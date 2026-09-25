package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.UpdateMonthlyIncomeRequest;
import com.lifeos.finance_tracker.domains.entity.UserFinanceSettings;
import com.lifeos.finance_tracker.domains.record.CategoryComparison;
import com.lifeos.finance_tracker.domains.record.CategoryPeriodSpend;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
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
    ComparisonWindow window = ComparisonWindow.thisMonthVsLast();

    BigDecimal currentMonthSpend =
        transactionRepository.sumCategorySpendByPeriod(
            userId, categoryId, window.currentStart(), window.currentEnd());
    BigDecimal lastMonthSpend =
        transactionRepository.sumCategorySpendByPeriod(
            userId, categoryId, window.previousStart(), window.previousEnd());

    return toComparison(categoryId, currentMonthSpend, lastMonthSpend);
  }

  /**
   * Aggregate form of {@link #getCategoryAnalytics}: the whole set of categories a page cares about
   * in one call and one grouped query, instead of the frontend fanning out one request per category.
   * The dashboard, budgets, analytics and report pages each did that fan-out (up to ~20 requests,
   * ~40 queries) and cached the results under different per-page keys, so navigating between them
   * re-ran the whole thing.
   *
   * <p>Deliberately not {@code @Cacheable}: the cache key would be the id set, and the four callers
   * ask about overlapping-but-different sets, so it would mostly miss while still needing eviction
   * on every transaction write. The single grouped query is cheap enough not to need it, and the
   * per-category method above stays cached for callers that want one.
   */
  public List<CategoryComparison> getCategoryAnalyticsBulk(
      Authentication authentication, List<UUID> categoryIds) {
    UUID userId = (UUID) authentication.getPrincipal();

    if (categoryIds == null || categoryIds.isEmpty()) {
      return List.of();
    }

    // Deduplicated so a repeated id doesn't widen the IN list, but the response is built from the
    // distinct ids below so every requested category still gets exactly one entry.
    List<UUID> distinctIds = categoryIds.stream().distinct().toList();
    ComparisonWindow window = ComparisonWindow.thisMonthVsLast();

    Map<UUID, CategoryPeriodSpend> spendByCategory =
        transactionRepository
            .sumCategorySpendForPeriods(
                userId,
                distinctIds,
                window.currentStart(),
                window.currentEnd(),
                window.previousStart(),
                window.previousEnd())
            .stream()
            .collect(Collectors.toMap(CategoryPeriodSpend::categoryId, row -> row));

    // A category with no spend in either period produces no row, so fall back to zeros rather than
    // omitting it - callers index this by categoryId and expect every id they asked for.
    return distinctIds.stream()
        .map(
            id -> {
              CategoryPeriodSpend row = spendByCategory.get(id);
              return row == null
                  ? toComparison(id, BigDecimal.ZERO, BigDecimal.ZERO)
                  : toComparison(id, row.currentPeriodSpend(), row.previousPeriodSpend());
            })
        .toList();
  }

  private CategoryComparison toComparison(
      UUID categoryId, BigDecimal currentSpend, BigDecimal previousSpend) {
    BigDecimal difference = currentSpend.subtract(previousSpend);
    BigDecimal percentageChange = BigDecimal.ZERO;

    if (previousSpend.compareTo(BigDecimal.ZERO) > 0) {
      percentageChange =
          difference.divide(previousSpend, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
    }

    return new CategoryComparison(
        categoryId, currentSpend, previousSpend, difference, percentageChange);
  }

  /** The "this month so far vs. all of last month" window both category endpoints compare over. */
  private record ComparisonWindow(
      Instant currentStart, Instant currentEnd, Instant previousStart, Instant previousEnd) {

    static ComparisonWindow thisMonthVsLast() {
      ZonedDateTime now = ZonedDateTime.now(ZONE_ID);
      ZonedDateTime lastMonth = now.minusMonths(1);

      return new ComparisonWindow(
          now.withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE_ID).toInstant(),
          now.toLocalDate().plusDays(1).atStartOfDay(ZONE_ID).toInstant(),
          lastMonth.withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE_ID).toInstant(),
          lastMonth
              .withDayOfMonth(lastMonth.toLocalDate().lengthOfMonth())
              .toLocalDate()
              .plusDays(1)
              .atStartOfDay(ZONE_ID)
              .toInstant());
    }
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
