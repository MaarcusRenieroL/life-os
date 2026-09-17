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
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Kolkata");
  private static final Duration CACHE_TTL = Duration.ofMinutes(5);

  private final TransactionRepository transactionRepository;
  private final UserFinanceSettingsRepository userFinanceSettingsRepository;
  private final StringRedisTemplate stringRedisTemplate;
  private final ObjectMapper objectMapper;

  public DashboardSummary getDashboardSummary(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    String key = "analytics:dashboard:" + userId + ":" + YearMonth.now(ZONE_ID);
    String cached = stringRedisTemplate.opsForValue().get(key);

    DashboardSummary result;
    if (cached != null) {
      result = objectMapper.readValue(cached, DashboardSummary.class);
    } else {
      ZonedDateTime now = ZonedDateTime.now(ZONE_ID);
      Instant start = now.withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE_ID).toInstant();
      Instant end = now.toLocalDate().plusDays(1).atStartOfDay(ZONE_ID).toInstant();

      result = transactionRepository.getDashboardSummary(userId, start, end);

      stringRedisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(result), CACHE_TTL);
    }

    // Fixed income is a user setting, not derived from transactions - always
    // read fresh (a single PK lookup, not worth caching) rather than letting
    // it go stale for up to CACHE_TTL after the user changes it.
    BigDecimal fixedMonthlyIncome =
        userFinanceSettingsRepository
            .findById(userId)
            .map(UserFinanceSettings::getMonthlyIncome)
            .orElse(null);

    return new DashboardSummary(result.totalIncome(), result.totalExpenses(), fixedMonthlyIncome);
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

  public CategoryComparison getCategoryAnalytics(Authentication authentication, UUID categoryId) {
    UUID userId = (UUID) authentication.getPrincipal();

    String key = "analytics:category:" + userId + ":" + categoryId;
    String cached = stringRedisTemplate.opsForValue().get(key);

    if (cached != null) {
      return objectMapper.readValue(cached, CategoryComparison.class);
    }

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

    CategoryComparison result =
        new CategoryComparison(
            categoryId, currentMonthSpend, lastMonthSpend, difference, percentageChange);

    stringRedisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(result), CACHE_TTL);

    return result;
  }

  public List<MonthlyTrend> getMonthlyTrends(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    String key = "analytics:trends:" + userId;
    String cached = stringRedisTemplate.opsForValue().get(key);

    if (cached != null) {
      return objectMapper.readValue(cached, new TypeReference<List<MonthlyTrend>>() {});
    }

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

    stringRedisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(trends), CACHE_TTL);

    return trends;
  }

  public List<MerchantSpend> getTopMerchants(Authentication authentication, int limit) {
    UUID userId = (UUID) authentication.getPrincipal();

    String key = "analytics:merchants:" + userId + ":" + limit;
    String cached = stringRedisTemplate.opsForValue().get(key);

    if (cached != null) {
      return objectMapper.readValue(cached, new TypeReference<List<MerchantSpend>>() {});
    }

    List<Object[]> rawMerchants = transactionRepository.getTopMerchantsRaw(userId, limit);

    List<MerchantSpend> merchants = new ArrayList<>();
    for (Object[] row : rawMerchants) {
      merchants.add(new MerchantSpend((String) row[0], (BigDecimal) row[1]));
    }

    stringRedisTemplate
        .opsForValue()
        .set(key, objectMapper.writeValueAsString(merchants), CACHE_TTL);

    return merchants;
  }
}
