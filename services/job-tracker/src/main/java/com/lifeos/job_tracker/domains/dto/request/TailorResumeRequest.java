package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** {@code instruction} is an optional free-text nudge ("make it more technical"). */
public record TailorResumeRequest(@NotNull UUID jobListingId, String instruction) {}
