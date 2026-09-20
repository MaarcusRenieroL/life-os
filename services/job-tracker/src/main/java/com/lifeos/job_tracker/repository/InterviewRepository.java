package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Interview;
import com.lifeos.job_tracker.domains.enums.InterviewResult;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRepository extends JpaRepository<Interview, UUID> {

  List<Interview> findByJobIdAndUserIdOrderByScheduledAtAsc(UUID jobId, UUID userId);

  Optional<Interview> findByIdAndUserId(UUID id, UUID userId);

  /** Cross-user - backs {@code JobAttentionScanner}'s daily interview-upcoming scan. */
  List<Interview> findByResultAndScheduledAtBetween(InterviewResult result, Instant from, Instant to);

  /** Scoped to one user - backs the internal {@code /today} endpoint. */
  List<Interview> findByUserIdAndResultAndScheduledAtBetween(
      UUID userId, InterviewResult result, Instant from, Instant to);
}
