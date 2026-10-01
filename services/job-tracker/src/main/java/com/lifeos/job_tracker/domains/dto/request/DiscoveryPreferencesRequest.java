package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import java.util.List;

public record DiscoveryPreferencesRequest(
    List<String> titleInclude,
    List<String> titleExclude,
    List<String> locations,
    SeniorityLevel maxSeniority,
    Integer alertMinScore) {}
