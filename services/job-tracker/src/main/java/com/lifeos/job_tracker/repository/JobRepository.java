package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Job;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobRepository extends JpaRepository<Job, UUID> {
  boolean existsByUserIdAndJobUrl(UUID userId, String jobUrl);
}
