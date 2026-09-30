package com.lifeos.job_tracker.domains.dto.response;

import java.util.List;

public record DiscoveryScanResponse(
    int companiesScanned, int newOpenings, int closedOpenings, List<String> errors) {}
