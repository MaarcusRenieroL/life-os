package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.entity.Category;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.enums.TransactionStatus;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import com.lifeos.finance_tracker.repository.CategoryRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Spending per day and per category over a date range, for core's analytics. Spend is DEBIT
 * transactions that count: ignored and duplicate rows are left out, and transfers between the
 * user's own accounts aren't spending. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SpendingStatsService {

  public record Day(LocalDate date, BigDecimal spend, BigDecimal income) {}

  public record CategorySpend(String category, BigDecimal amount) {}

  public record SpendingStats(List<Day> days, List<CategorySpend> categories, BigDecimal totalSpend, BigDecimal totalIncome) {}

  private final TransactionRepository transactionRepository;
  private final CategoryRepository categoryRepository;

  public SpendingStats stats(UUID userId, LocalDate from, LocalDate to, ZoneId zone) {
    List<Transaction> transactions =
        transactionRepository.findAllByUserIdAndTransactionDateBetweenOrderByTransactionDateAsc(
            userId, from.atStartOfDay(zone).toInstant(), to.plusDays(1).atStartOfDay(zone).toInstant());

    Map<UUID, String> categoryNames = new HashMap<>();
    for (Category c : categoryRepository.findAllByUserIdOrUserIdIsNull(userId)) categoryNames.put(c.getId(), c.getName());

    Map<LocalDate, BigDecimal[]> byDay = new TreeMap<>();
    for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) byDay.put(d, new BigDecimal[] {BigDecimal.ZERO, BigDecimal.ZERO});
    Map<String, BigDecimal> byCategory = new HashMap<>();
    BigDecimal spend = BigDecimal.ZERO;
    BigDecimal income = BigDecimal.ZERO;

    for (Transaction t : transactions) {
      if (t.isDuplicate() || t.getStatus() == TransactionStatus.IGNORED || t.getType() == TransactionType.TRANSFER) continue;
      BigDecimal[] slot = byDay.get(t.getTransactionDate().atZone(zone).toLocalDate());
      if (slot == null) continue;
      if (t.getType() == TransactionType.DEBIT) {
        slot[0] = slot[0].add(t.getAmount());
        spend = spend.add(t.getAmount());
        String name = t.getCategoryId() == null ? "Uncategorised" : categoryNames.getOrDefault(t.getCategoryId(), "Uncategorised");
        byCategory.merge(name, t.getAmount(), BigDecimal::add);
      } else {
        slot[1] = slot[1].add(t.getAmount());
        income = income.add(t.getAmount());
      }
    }

    List<Day> days = new ArrayList<>();
    byDay.forEach((date, v) -> days.add(new Day(date, v[0], v[1])));
    List<CategorySpend> categories =
        byCategory.entrySet().stream()
            .map(e -> new CategorySpend(e.getKey(), e.getValue()))
            .sorted(Comparator.comparing(CategorySpend::amount).reversed())
            .toList();
    return new SpendingStats(days, categories, spend, income);
  }
}
