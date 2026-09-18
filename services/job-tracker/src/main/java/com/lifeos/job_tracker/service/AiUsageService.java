package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.AiUsageLog;
import com.lifeos.job_tracker.domains.record.AiUsageSummaryResponse;
import com.lifeos.job_tracker.domains.record.AiUsageSummaryResponse.DailyCost;
import com.lifeos.job_tracker.repository.AiUsageLogRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiUsageService {

  private final AiUsageLogRepository repository;

  @Transactional(readOnly = true)
  public AiUsageSummaryResponse summary() {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    Instant monthStart = today.withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    Instant thirtyDaysAgo = today.minusDays(29).atStartOfDay(ZoneOffset.UTC).toInstant();

    List<AiUsageLog> recent = repository.findSince(thirtyDaysAgo);

    Map<LocalDate, BigDecimal> byDay = new LinkedHashMap<>();
    for (LocalDate d = today.minusDays(29); !d.isAfter(today); d = d.plusDays(1)) {
      byDay.put(d, BigDecimal.ZERO);
    }
    for (AiUsageLog logEntry : recent) {
      if (logEntry.getEstimatedCostUsd() == null) continue;
      LocalDate day = logEntry.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate();
      byDay.merge(day, logEntry.getEstimatedCostUsd(), BigDecimal::add);
    }
    List<DailyCost> costLast30Days = byDay.entrySet().stream().map(e -> new DailyCost(e.getKey(), e.getValue())).toList();

    return new AiUsageSummaryResponse(
        repository.sumCost(),
        repository.sumCostSince(monthStart),
        repository.count(),
        repository.sumInputTokens(),
        repository.sumOutputTokens(),
        costLast30Days);
  }
}
