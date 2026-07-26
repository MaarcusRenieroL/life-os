package com.lifeos.finance_tracker.service;

import com.lifeos.common.events.AuditEventType;
import com.lifeos.finance_tracker.domains.entity.RecurringPattern;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.enums.RecurringFrequency;
import com.lifeos.finance_tracker.publisher.AuditEventPublisher;
import com.lifeos.finance_tracker.repository.RecurringPatternRepository;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RecurringDetectionService {

  private final TransactionRepository transactionRepository;
  private final RecurringPatternRepository recurringPatternRepository;

  private final AuditEventPublisher auditEventPublisher;

  private final MerchantClusteringService merchantClusteringService;

  public void detectPatterns(UUID userId) {
    List<Transaction> transactions =
        transactionRepository.findAllByUserIdOrderByTransactionDateDesc(userId);
    List<String> distinctDescriptions =
        transactions.stream().map(Transaction::getDescription).distinct().toList();

    Map<String, String> clusterDescriptionsMap =
        merchantClusteringService.clusterDescriptions(distinctDescriptions);

    Map<String, List<Transaction>> grouped =
        transactions.stream()
            .collect(Collectors.groupingBy(t -> clusterDescriptionsMap.get(t.getDescription())));

    for (Map.Entry<String, List<Transaction>> entry : grouped.entrySet()) {
      String merchantKey = entry.getKey();
      List<Transaction> group = entry.getValue();

      if (group.size() < 3) {
        continue;
      }

      group.sort(Comparator.comparing(Transaction::getTransactionDate));

      List<Long> intervalDays = new ArrayList<>();

      for (int i = 1; i < group.size(); i++) {
        intervalDays.add(
            Duration.between(
                    group.get(i - 1).getTransactionDate(), group.get(i).getTransactionDate())
                .toDays());
      }

      double averageIntervalDays =
          intervalDays.stream().mapToLong(Long::longValue).average().orElse(0);

      RecurringFrequency frequency;

      if (isNear(averageIntervalDays, 7, 0.2)) {
        frequency = RecurringFrequency.WEEKLY;
      } else if (isNear(averageIntervalDays, 14, 0.2)) {
        frequency = RecurringFrequency.BIWEEKLY;
      } else if (isNear(averageIntervalDays, 30, 0.2)) {
        frequency = RecurringFrequency.MONTHLY;
      } else if (isNear(averageIntervalDays, 90, 0.2)) {
        frequency = RecurringFrequency.QUARTERLY;
      } else if (isNear(averageIntervalDays, 365, 0.2)) {
        frequency = RecurringFrequency.YEARLY;
      } else {
        continue;
      }

      BigDecimal averageAmount =
          group.stream()
              .map(Transaction::getAmount)
              .reduce(BigDecimal.ZERO, BigDecimal::add)
              .divide(BigDecimal.valueOf(group.size()), 2, RoundingMode.HALF_UP);
      BigDecimal maxAmount =
          group.stream().map(Transaction::getAmount).max(Comparator.naturalOrder()).get();
      BigDecimal minAmount =
          group.stream().map(Transaction::getAmount).min(Comparator.naturalOrder()).get();

      BigDecimal variance =
          maxAmount
              .subtract(minAmount)
              .divide(averageAmount, 4, RoundingMode.HALF_UP)
              .multiply(BigDecimal.valueOf(100));

      double intervalStdDev =
          Math.sqrt(
              intervalDays.stream()
                  .mapToDouble(d -> Math.pow(d - averageIntervalDays, 2))
                  .average()
                  .orElse(0));
      double occurrenceFactor = Math.min(1.0, group.size() / 6.0);
      double intervalFactor = 1.0 - Math.min(intervalStdDev / averageIntervalDays, 1.0);
      double amountFactor = 1.0 - Math.min(variance.doubleValue() / 50.0, 1.0);

      BigDecimal confidenceScore =
          BigDecimal.valueOf(occurrenceFactor * intervalFactor * amountFactor)
              .setScale(3, RoundingMode.HALF_UP);
      Instant lastDate = group.get(group.size() - 1).getTransactionDate();
      Instant nextExpectedDate = lastDate.plus((long) averageIntervalDays, ChronoUnit.DAYS);

      RecurringPattern pattern =
          recurringPatternRepository
              .findByUserIdAndMerchantKey(userId, merchantKey)
              .orElseGet(
                  () -> RecurringPattern.builder().userId(userId).merchantKey(merchantKey).build());

      boolean isNewPattern = pattern.getId() == null;

      pattern.setAverageAmount(averageAmount);
      pattern.setFrequency(frequency);
      pattern.setLastTransactionDate(lastDate);
      pattern.setNextExpectedDate(nextExpectedDate);
      pattern.setVariance(variance);
      pattern.setConfidenceScore(confidenceScore);
      pattern.setLastDetectedAt(Instant.now());

      recurringPatternRepository.save(pattern);

      if (isNewPattern) {
        auditEventPublisher.publish(
            userId,
            AuditEventType.RECURRING_DETECTED,
            "New recurring pattern detected: " + merchantKey,
            Map.of("merchantKey", merchantKey, "averageAmount", averageAmount.toString()));
      }
    }
  }

  private boolean isNear(double actual, int target, double tolerance) {
    return Math.abs(actual - target) <= target * tolerance;
  }
}
