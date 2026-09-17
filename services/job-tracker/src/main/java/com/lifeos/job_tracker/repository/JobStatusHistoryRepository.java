package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.JobStatusHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobStatusHistoryRepository extends JpaRepository<JobStatusHistory, UUID> {

  List<JobStatusHistory> findByUserIdOrderByJobIdAscChangedAtAsc(UUID userId);
}
