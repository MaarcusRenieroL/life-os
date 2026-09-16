package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.AiUsageLog;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {

  @Query("select log from AiUsageLog log where log.createdAt >= :since order by log.createdAt asc")
  List<AiUsageLog> findSince(@Param("since") Instant since);

  @Query("select coalesce(sum(log.estimatedCostUsd), 0) from AiUsageLog log")
  BigDecimal sumCost();

  @Query("select coalesce(sum(log.estimatedCostUsd), 0) from AiUsageLog log where log.createdAt >= :since")
  BigDecimal sumCostSince(@Param("since") Instant since);

  @Query("select coalesce(sum(log.inputTokens), 0) from AiUsageLog log")
  long sumInputTokens();

  @Query("select coalesce(sum(log.outputTokens), 0) from AiUsageLog log")
  long sumOutputTokens();
}
