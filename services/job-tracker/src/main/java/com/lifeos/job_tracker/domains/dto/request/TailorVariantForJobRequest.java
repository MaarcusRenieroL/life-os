package com.lifeos.job_tracker.domains.dto.request;

import java.util.UUID;

public record TailorVariantForJobRequest(String customInstructions, UUID applicationId) {}
