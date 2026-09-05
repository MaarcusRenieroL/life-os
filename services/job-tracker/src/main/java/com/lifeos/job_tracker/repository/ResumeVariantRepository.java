package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.ResumeVariant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeVariantRepository extends JpaRepository<ResumeVariant, UUID> {

  List<ResumeVariant> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

  Optional<ResumeVariant> findByIdAndUserId(UUID id, UUID userId);

  Optional<ResumeVariant> findFirstByUserIdAndBaseIsTrueOrderByCreatedAtDesc(UUID userId);

  boolean existsByUserIdAndName(UUID userId, String name);
}
