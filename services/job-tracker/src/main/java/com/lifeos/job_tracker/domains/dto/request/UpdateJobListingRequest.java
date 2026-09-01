package com.lifeos.job_tracker.domains.dto.request;

import java.util.List;

/** Partial update; null fields are left unchanged. */
public record UpdateJobListingRequest(
    Boolean saved, Boolean dismissed, List<String> tags, String notes) {}
