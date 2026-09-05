package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.ResumeKeywordMatch;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeKeywordMatchRepository extends JpaRepository<ResumeKeywordMatch, UUID> {

  List<ResumeKeywordMatch> findAllByResumeVariantIdOrderByAnalyzedAtDesc(UUID resumeVariantId);

  List<ResumeKeywordMatch> findAllByResumeVariantIdAndJobListingIdOrderByAnalyzedAtDesc(
      UUID resumeVariantId, UUID jobListingId);
}
