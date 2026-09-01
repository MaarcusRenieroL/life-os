package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.FollowUpTask;
import com.lifeos.job_tracker.domains.enums.FollowUpTaskStatus;
import com.lifeos.job_tracker.domains.enums.FollowUpTaskType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FollowUpTaskRepository extends JpaRepository<FollowUpTask, UUID> {

  Optional<FollowUpTask> findByIdAndUserId(UUID id, UUID userId);

  List<FollowUpTask> findAllByUserIdAndStatusOrderByDueDateAsc(UUID userId, FollowUpTaskStatus status);

  List<FollowUpTask> findAllByUserIdOrderByDueDateAsc(UUID userId);

  boolean existsByApplicationIdAndType(UUID applicationId, FollowUpTaskType type);

  List<FollowUpTask> findAllByStatusAndNotifiedFalseAndDueDateBefore(
      FollowUpTaskStatus status, Instant cutoff);
}
