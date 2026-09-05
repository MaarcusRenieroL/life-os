package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.ResumeSection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeSectionRepository extends JpaRepository<ResumeSection, UUID> {

  List<ResumeSection> findAllByResumeVariantIdOrderBySortOrderAsc(UUID resumeVariantId);

  Optional<ResumeSection> findByIdAndResumeVariantId(UUID id, UUID resumeVariantId);

  void deleteAllByResumeVariantId(UUID resumeVariantId);
}
