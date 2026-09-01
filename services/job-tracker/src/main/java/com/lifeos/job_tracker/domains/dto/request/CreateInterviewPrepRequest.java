package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateInterviewPrepRequest(
    @NotBlank String title, String description, String resourceLink) {}
