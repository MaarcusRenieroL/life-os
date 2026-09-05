package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.ResumeTailoring;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeTailoringRepository extends JpaRepository<ResumeTailoring, UUID> {

  Optional<ResumeTailoring> findByIdAndUserId(UUID id, UUID userId);

  List<ResumeTailoring> findAllByUserIdAndJobListingIdOrderByCreatedAtDesc(UUID userId, UUID jobListingId);

  Optional<ResumeTailoring> findFirstByUserIdAndApplicationIdOrderByCreatedAtDesc(
      UUID userId, UUID applicationId);
}
