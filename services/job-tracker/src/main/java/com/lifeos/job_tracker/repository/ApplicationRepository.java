package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

  Optional<Application> findByIdAndUserId(UUID id, UUID userId);

  List<Application> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

  List<Application> findAllByUserIdAndStatusOrderByApplicationDateDesc(
      UUID userId, ApplicationStatus status);

  boolean existsByUserIdAndJobListingId(UUID userId, UUID jobListingId);

  Optional<Application> findByUserIdAndJobListingId(UUID userId, UUID jobListingId);

  /** Non-terminal applications whose follow-up reminder is due on/before {@code asOf}. */
  @Query(
      """
      select a from Application a
      where a.userId = :userId
        and a.status not in (com.lifeos.job_tracker.domains.enums.ApplicationStatus.REJECTED,
                             com.lifeos.job_tracker.domains.enums.ApplicationStatus.WITHDRAWN)
        and a.followUpReminderDate is not null
        and a.followUpReminderDate <= :asOf
      order by a.followUpReminderDate asc
      """)
  List<Application> findNeedingFollowUp(@Param("userId") UUID userId, @Param("asOf") Instant asOf);
}
