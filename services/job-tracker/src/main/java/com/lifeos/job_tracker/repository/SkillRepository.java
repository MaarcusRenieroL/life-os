package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Skill;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillRepository extends JpaRepository<Skill, UUID> {

  List<Skill> findAllByUserIdOrderByNameAsc(UUID userId);

  Optional<Skill> findByIdAndUserId(UUID id, UUID userId);

  Optional<Skill> findByUserIdAndNameIgnoreCase(UUID userId, String name);
}
