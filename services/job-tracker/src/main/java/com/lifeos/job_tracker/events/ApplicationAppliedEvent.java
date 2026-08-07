package com.lifeos.job_tracker.events;

import java.time.Instant;
import java.util.UUID;

public record ApplicationAppliedEvent(
    UUID applicationId, UUID jobId, UUID userId, Instant appliedAt) {}
