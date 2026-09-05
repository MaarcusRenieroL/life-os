package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record UpsertAccomplishmentRequest(
    String category, @NotBlank String bulletText, List<String> keywords, java.util.UUID sourceSectionId) {}
