package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Application;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {
  List<Application> findAllByUserId(UUID userId);

  Optional<Application> findByIdAndUserId(UUID id, UUID userId);
}
