package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.JobStatus;

/** Move a tracked job to a new pipeline stage. */
public record UpdateJobListingRequest(JobStatus status) {}
