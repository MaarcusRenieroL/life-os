package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateCoverLetterRequest(@NotBlank String generatedContent) {}
