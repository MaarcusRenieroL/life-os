package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.JobSource;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobSourceRepository extends JpaRepository<JobSource, UUID> {

  List<JobSource> findAllByUserIdOrderByNameAsc(UUID userId);

  Optional<JobSource> findByIdAndUserId(UUID id, UUID userId);

  boolean existsByUserIdAndName(UUID userId, String name);
}
