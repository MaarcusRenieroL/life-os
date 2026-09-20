package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.JobListing;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobListingRepository extends JpaRepository<JobListing, UUID> {

  Optional<JobListing> findByIdAndUserId(UUID id, UUID userId);

  Optional<JobListing> findByUserIdAndUrl(UUID userId, String url);

  /**
   * Unbounded - kept for callers that genuinely need every job for a user (analytics aggregation,
   * email-event company matching). Prefer {@link #findAllForUser(UUID, Pageable)} for anything
   * that renders a list, e.g. {@code JobListingService.list}.
   */
  @Query(
      """
      select j from JobListing j
      where j.userId = :userId
      order by j.fitScore desc nulls last, j.createdAt desc
      """)
  List<JobListing> findAllForUser(@Param("userId") UUID userId);

  @Query(
      """
      select j from JobListing j
      where j.userId = :userId
      order by j.fitScore desc nulls last, j.createdAt desc
      """)
  List<JobListing> findAllForUser(@Param("userId") UUID userId, Pageable pageable);
}
