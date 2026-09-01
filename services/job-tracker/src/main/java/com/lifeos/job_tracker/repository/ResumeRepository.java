package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Resume;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeRepository extends JpaRepository<Resume, UUID> {

  List<Resume> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

  Optional<Resume> findByIdAndUserId(UUID id, UUID userId);

  Optional<Resume> findFirstByUserIdAndBaseIsTrueOrderByCreatedAtDesc(UUID userId);
}
