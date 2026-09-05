package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.ScrapeFrequency;
import jakarta.validation.constraints.NotBlank;

public record UpsertJobSourceRequest(
    @NotBlank String name, String url, ScrapeFrequency scrapeFrequency, Boolean active) {}
