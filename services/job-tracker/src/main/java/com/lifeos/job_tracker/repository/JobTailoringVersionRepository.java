package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.JobTailoringVersion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobTailoringVersionRepository extends JpaRepository<JobTailoringVersion, UUID> {

  List<JobTailoringVersion> findByJobIdAndUserIdOrderByVersionDesc(UUID jobId, UUID userId);

  Optional<JobTailoringVersion> findByIdAndUserId(UUID id, UUID userId);

  int countByJobId(UUID jobId);
}
