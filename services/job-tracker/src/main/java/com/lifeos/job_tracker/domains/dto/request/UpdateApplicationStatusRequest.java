package com.lifeos.job_tracker.domains.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateApplicationStatusRequest(@NotBlank String status, String note) {}
