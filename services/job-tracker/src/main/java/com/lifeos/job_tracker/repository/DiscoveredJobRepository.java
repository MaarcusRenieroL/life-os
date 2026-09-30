package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.DiscoveredJob;
import com.lifeos.job_tracker.domains.enums.DiscoveredJobStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiscoveredJobRepository extends JpaRepository<DiscoveredJob, UUID> {

  Optional<DiscoveredJob> findByIdAndUserId(UUID id, UUID userId);

  List<DiscoveredJob> findAllByWatchedCompanyId(UUID watchedCompanyId);

  /** Open (not closed on the board) inbox rows, best fit first. */
  @Query(
      """
      select j from DiscoveredJob j
      where j.userId = :userId and j.closedAt is null
        and j.status = :status
        and (:minScore is null or j.fitScore >= :minScore)
        and (:watchedCompanyId is null or j.watchedCompanyId = :watchedCompanyId)
      order by j.fitScore desc nulls last, j.firstSeenAt desc
      """)
  List<DiscoveredJob> inbox(
      @Param("userId") UUID userId,
      @Param("status") DiscoveredJobStatus status,
      @Param("minScore") Integer minScore,
      @Param("watchedCompanyId") UUID watchedCompanyId,
      Pageable pageable);

  /** Rows on this company's board that the just-finished scan did not see: the postings that closed. */
  @Query(
      """
      select j from DiscoveredJob j
      where j.watchedCompanyId = :watchedCompanyId and j.closedAt is null
        and j.lastSeenAt < :runStartedAt
      """)
  List<DiscoveredJob> findUnseenSince(
      @Param("watchedCompanyId") UUID watchedCompanyId, @Param("runStartedAt") Instant runStartedAt);

  long countByUserIdAndStatusAndClosedAtIsNull(UUID userId, DiscoveredJobStatus status);
}
