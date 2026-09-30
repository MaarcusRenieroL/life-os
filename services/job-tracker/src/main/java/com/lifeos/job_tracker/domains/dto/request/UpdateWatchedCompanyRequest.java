package com.lifeos.job_tracker.domains.dto.request;

/** Both fields optional; only the ones sent are changed. */
public record UpdateWatchedCompanyRequest(Boolean active, Boolean alert) {}
