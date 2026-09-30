package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.JobBoard;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AddWatchedCompanyRequest(
    @NotBlank String name, @NotNull JobBoard board, @NotBlank String slug, String domain, Boolean alert) {}
