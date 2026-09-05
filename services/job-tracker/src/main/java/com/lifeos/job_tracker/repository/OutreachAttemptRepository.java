package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.OutreachAttempt;
import com.lifeos.job_tracker.domains.enums.OutreachStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutreachAttemptRepository extends JpaRepository<OutreachAttempt, UUID> {

  List<OutreachAttempt> findAllByApplicationIdOrderByCreatedAtAsc(UUID applicationId);

  List<OutreachAttempt> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

  List<OutreachAttempt> findAllByStatusAndScheduledForBefore(OutreachStatus status, Instant cutoff);
}
