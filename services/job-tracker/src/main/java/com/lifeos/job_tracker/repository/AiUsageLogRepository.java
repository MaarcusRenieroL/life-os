package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.AiUsageLog;
import com.lifeos.job_tracker.domains.record.AiUsageTotals;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {

  @Query("select log from AiUsageLog log where log.createdAt >= :since order by log.createdAt asc")
  List<AiUsageLog> findSince(@Param("since") Instant since);

  /**
   * All five scalars the usage widget shows, in one pass. Was five queries (sumCost, sumCostSince,
   * count, sumInputTokens, sumOutputTokens), each scanning the whole table for one number.
   *
   * <p>The month-to-date figure is a conditional aggregate rather than a second query: sum() skips
   * nulls, so the case expression contributes only rows on or after monthStart. No coalesce here -
   * an empty table yields nulls, which {@link AiUsageTotals}'s accessors turn into zeros.
   */
  @Query(
      """
      select new com.lifeos.job_tracker.domains.record.AiUsageTotals(
        sum(log.estimatedCostUsd),
        sum(case when log.createdAt >= :monthStart then log.estimatedCostUsd else null end),
        count(log),
        sum(log.inputTokens),
        sum(log.outputTokens))
      from AiUsageLog log
      """)
  AiUsageTotals totals(@Param("monthStart") Instant monthStart);
}
