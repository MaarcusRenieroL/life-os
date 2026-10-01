package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.DiscoveredJob;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** {@code description} is only populated on the single-job endpoint; the inbox list omits it. */
public record DiscoveredJobResponse(
    UUID id,
    UUID watchedCompanyId,
    String company,
    String title,
    String url,
    String location,
    Instant postedAt,
    Instant firstSeenAt,
    Integer fitScore,
    Map<String, Object> fitExplanation,
    String status,
    UUID promotedJobId,
    String description) {

  public static DiscoveredJobResponse from(DiscoveredJob job, boolean includeDescription) {
    return new DiscoveredJobResponse(
        job.getId(),
        job.getWatchedCompanyId(),
        job.getCompany(),
        job.getTitle(),
        job.getUrl(),
        job.getLocation(),
        job.getPostedAt(),
        job.getFirstSeenAt(),
        job.getFitScore(),
        job.getFitExplanation(),
        job.getStatus().name(),
        job.getPromotedJobId(),
        includeDescription ? job.getDescription() : null);
  }
}
