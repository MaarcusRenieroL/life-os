package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.EmailEvent;
import com.lifeos.job_tracker.domains.enums.EmailEventStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailEventRepository extends JpaRepository<EmailEvent, UUID> {

  boolean existsByUserIdAndGmailMessageId(UUID userId, String gmailMessageId);

  Optional<EmailEvent> findByIdAndUserId(UUID id, UUID userId);

  List<EmailEvent> findByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, EmailEventStatus status);
}
