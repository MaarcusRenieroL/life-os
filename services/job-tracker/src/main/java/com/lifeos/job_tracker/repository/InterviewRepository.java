package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Interview;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRepository extends JpaRepository<Interview, UUID> {

  List<Interview> findByJobIdAndUserIdOrderByScheduledAtAsc(UUID jobId, UUID userId);

  Optional<Interview> findByIdAndUserId(UUID id, UUID userId);
}
