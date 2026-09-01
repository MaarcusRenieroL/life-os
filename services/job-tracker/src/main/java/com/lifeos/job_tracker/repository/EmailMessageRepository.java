package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.EmailMessage;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailMessageRepository extends JpaRepository<EmailMessage, UUID> {

  Optional<EmailMessage> findByUserIdAndExternalMessageId(UUID userId, String externalMessageId);

  List<EmailMessage> findAllByApplicationIdOrderByReceivedAtAsc(UUID applicationId);

  List<EmailMessage> findAllByUserIdAndThreadIdOrderByReceivedAtAsc(UUID userId, String threadId);
}
