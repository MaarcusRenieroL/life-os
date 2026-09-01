package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.JobSource;
import java.time.Instant;
import java.util.UUID;

public record JobSourceResponse(
    UUID id, String name, String url, String scrapeFrequency, Instant lastScraped, boolean active) {

  public static JobSourceResponse from(JobSource source) {
    return new JobSourceResponse(
        source.getId(),
        source.getName(),
        source.getUrl(),
        source.getScrapeFrequency() == null ? null : source.getScrapeFrequency().name(),
        source.getLastScraped(),
        source.isActive());
  }
}
