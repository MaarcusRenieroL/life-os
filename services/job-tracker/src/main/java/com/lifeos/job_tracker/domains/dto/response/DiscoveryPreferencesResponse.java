package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.DiscoveryPreferences;
import java.util.List;

public record DiscoveryPreferencesResponse(
    List<String> titleInclude,
    List<String> titleExclude,
    List<String> locations,
    String maxSeniority,
    int alertMinScore) {

  public static DiscoveryPreferencesResponse from(DiscoveryPreferences prefs) {
    return new DiscoveryPreferencesResponse(
        prefs.getTitleInclude(),
        prefs.getTitleExclude(),
        prefs.getLocations(),
        prefs.getMaxSeniority() == null ? null : prefs.getMaxSeniority().name(),
        prefs.getAlertMinScore());
  }
}
