package com.lifeos.job_tracker.domains.record;

import java.time.Instant;
import java.util.UUID;

public record ApplicationStageChangedEvent(
    UUID applicationId,
    UUID jobId,
    UUID userId,
    String previousStage,
    String newStage,
    Instant changedAt) {}
