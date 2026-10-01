package com.lifeos.tasks.repository;

import com.lifeos.tasks.domains.entity.Project;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

  List<Project> findAllByUserIdOrderByNameAsc(UUID userId);

  Optional<Project> findByIdAndUserId(UUID id, UUID userId);
}
