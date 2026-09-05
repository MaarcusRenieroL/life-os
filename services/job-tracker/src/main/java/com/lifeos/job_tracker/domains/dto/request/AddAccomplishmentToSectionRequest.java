package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AddAccomplishmentToSectionRequest(@NotNull UUID resumeVariantId, @NotNull UUID sectionId) {}
