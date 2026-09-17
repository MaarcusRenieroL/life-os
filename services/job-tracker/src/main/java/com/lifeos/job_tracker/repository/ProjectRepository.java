package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Project;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

  List<Project> findAllByUserIdOrderByDisplayOrderAsc(UUID userId);

  Optional<Project> findByIdAndUserId(UUID id, UUID userId);

  void deleteByUserId(UUID userId);

  long countByUserId(UUID userId);
}
