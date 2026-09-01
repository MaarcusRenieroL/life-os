package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Notification;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

  List<Notification> findTop100ByUserIdOrderByCreatedAtDesc(UUID userId);

  long countByUserIdAndReadIsFalse(UUID userId);

  Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

  @Modifying
  @Query("update Notification n set n.read = true where n.userId = :userId and n.read = false")
  int markAllRead(@Param("userId") UUID userId);
}
