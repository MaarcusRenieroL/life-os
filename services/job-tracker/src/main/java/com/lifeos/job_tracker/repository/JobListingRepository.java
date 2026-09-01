package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.JobListing;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobListingRepository
    extends JpaRepository<JobListing, UUID>, JpaSpecificationExecutor<JobListing> {

  Optional<JobListing> findByIdAndUserId(UUID id, UUID userId);

  List<JobListing> findAllByUserIdAndSavedIsTrueOrderByCreatedAtDesc(UUID userId);

  Optional<JobListing> findByUserIdAndSourceAndExternalId(UUID userId, String source, String externalId);

  Optional<JobListing> findByUserIdAndUrl(UUID userId, String url);

  /**
   * Curated feed: not dismissed, not already applied to, posted on/after {@code since} (null = no
   * lower bound), ordered by fit score then recency.
   */
  @Query(
      """
      select j from JobListing j
      where j.userId = :userId
        and j.dismissed = false
        and (:since is null or j.postedDate >= :since)
        and not exists (
          select 1 from Application a where a.jobListingId = j.id and a.userId = :userId
        )
      order by j.fitScore desc nulls last, j.postedDate desc nulls last, j.createdAt desc
      """)
  Page<JobListing> findCurated(
      @Param("userId") UUID userId, @Param("since") LocalDate since, Pageable pageable);
}
