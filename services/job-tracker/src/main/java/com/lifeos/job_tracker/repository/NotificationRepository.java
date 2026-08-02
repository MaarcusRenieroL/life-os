package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Notification;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {}
