package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.ApplicationStatusHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationStatusHistoryRepository
    extends JpaRepository<ApplicationStatusHistory, UUID> {

  List<ApplicationStatusHistory> findAllByApplicationIdOrderByChangedAtDesc(UUID applicationId);
}
