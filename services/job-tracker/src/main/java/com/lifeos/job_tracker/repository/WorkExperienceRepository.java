package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.WorkExperience;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkExperienceRepository extends JpaRepository<WorkExperience, UUID> {

  List<WorkExperience> findAllByUserIdOrderByDisplayOrderAsc(UUID userId);

  Optional<WorkExperience> findByIdAndUserId(UUID id, UUID userId);

  void deleteByUserId(UUID userId);

  long countByUserId(UUID userId);
}
