package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.ApplicationMethod;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateApplicationRequest(
    @NotNull UUID jobListingId,
    UUID resumeId,
    ApplicationMethod applicationMethod,
    String coverLetterText,
    String customMessageText,
    String notes) {}
