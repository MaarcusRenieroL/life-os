package com.lifeos.job_tracker.domains.dto.request;

import java.util.UUID;

/** Body core's QuickCaptureService posts to {@code /v1/jobs/internal/quick-job} once its AI
 * classifier has decided a one-line free-text capture (e.g. "applied to Stripe for backend
 * engineer") is a job application - just enough to seed a minimal {@link
 * com.lifeos.job_tracker.domains.entity.JobListing}, nothing the link/manual-entry paths collect
 * (description, salary, etc.) since there is no source text to parse it from. */
public record QuickCaptureJobRequest(UUID userId, String company, String title) {}
