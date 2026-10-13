package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.Notification;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

  Page<Notification> findAllByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

  Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

  long countByUserIdAndReadFalse(UUID userId);

  List<Notification> findAllByUserIdAndReadFalse(UUID userId);

  @Modifying
  @Query("update Notification n set n.read = true where n.userId = :userId and n.read = false")
  void markAllReadForUser(@Param("userId") UUID userId);

  /** Clearing never throws away an AI-fallback question that is still waiting for a yes/no. */
  @Modifying
  @Query("delete from Notification n where n.userId = :userId and (n.requiresAiFallbackApproval = false or n.aiFallbackApproved is not null)")
  int deleteAnsweredForUser(@Param("userId") UUID userId);

  @Modifying
  @Query("delete from Notification n where n.userId = :userId and n.read = true and (n.requiresAiFallbackApproval = false or n.aiFallbackApproved is not null)")
  int deleteReadForUser(@Param("userId") UUID userId);
}
