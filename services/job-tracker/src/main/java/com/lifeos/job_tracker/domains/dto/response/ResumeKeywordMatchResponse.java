package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.ResumeKeywordMatch;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ResumeKeywordMatchResponse(
    UUID id,
    UUID resumeVariantId,
    UUID jobListingId,
    List<String> matchedKeywords,
    List<String> missingKeywords,
    BigDecimal keywordDensity,
    Integer score,
    Instant analyzedAt) {

  public static ResumeKeywordMatchResponse from(ResumeKeywordMatch match) {
    return new ResumeKeywordMatchResponse(
        match.getId(),
        match.getResumeVariantId(),
        match.getJobListingId(),
        match.getMatchedKeywords(),
        match.getMissingKeywords(),
        match.getKeywordDensity(),
        match.getScore(),
        match.getAnalyzedAt());
  }
}
