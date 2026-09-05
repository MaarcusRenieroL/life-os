package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CreateResumeVariantRequest(@NotBlank String name, String description, UUID baseVariantId) {}
