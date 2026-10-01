package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.EmailHubItem;
import com.lifeos.core.domains.enums.EmailHubStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailHubItemRepository extends JpaRepository<EmailHubItem, UUID> {

  boolean existsByUserIdAndGmailMessageId(UUID userId, String gmailMessageId);

  Optional<EmailHubItem> findByIdAndUserId(UUID id, UUID userId);

  List<EmailHubItem> findByUserIdAndStatusInOrderByCreatedAtDesc(
      UUID userId, Collection<EmailHubStatus> statuses, Pageable pageable);

  long countByUserIdAndStatus(UUID userId, EmailHubStatus status);
}
