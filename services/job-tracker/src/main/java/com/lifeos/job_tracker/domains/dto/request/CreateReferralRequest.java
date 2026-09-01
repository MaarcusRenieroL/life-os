package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateReferralRequest(
    @NotNull UUID contactId, String messageSent, Boolean generateMessage) {}
