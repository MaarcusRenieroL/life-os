package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.WatchedCompany;
import java.time.Instant;
import java.util.UUID;

public record WatchedCompanyResponse(
    UUID id,
    String name,
    String board,
    String slug,
    String domain,
    boolean alert,
    boolean active,
    Instant baselinedAt,
    Instant lastFetchedAt,
    String lastFetchError,
    Integer lastOpenCount) {

  public static WatchedCompanyResponse from(WatchedCompany company) {
    return new WatchedCompanyResponse(
        company.getId(),
        company.getName(),
        company.getBoard().name(),
        company.getSlug(),
        company.getDomain(),
        company.isAlert(),
        company.isActive(),
        company.getBaselinedAt(),
        company.getLastFetchedAt(),
        company.getLastFetchError(),
        company.getLastOpenCount());
  }
}
