package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.CoverLetterTemplate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoverLetterTemplateRepository extends JpaRepository<CoverLetterTemplate, UUID> {

  List<CoverLetterTemplate> findAllByUserIdIsNullOrUserId(UUID userId);

  Optional<CoverLetterTemplate> findByIdAndUserId(UUID id, UUID userId);
}
