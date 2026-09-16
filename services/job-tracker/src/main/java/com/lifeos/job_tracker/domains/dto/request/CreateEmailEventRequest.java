package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Forwarded by batches' Gmail poller for one email matching the job-tracking search query. */
public record CreateEmailEventRequest(
    @NotNull UUID userId,
    @NotBlank String gmailMessageId,
    @NotBlank String fromAddress,
    String subject,
    String body) {}
