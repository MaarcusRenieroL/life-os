package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.CoverLetter;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoverLetterRepository extends JpaRepository<CoverLetter, UUID> {

  Optional<CoverLetter> findByIdAndUserId(UUID id, UUID userId);

  Optional<CoverLetter> findByApplicationIdAndUserId(UUID applicationId, UUID userId);
}
