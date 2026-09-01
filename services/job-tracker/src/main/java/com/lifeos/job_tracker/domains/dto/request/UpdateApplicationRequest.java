package com.lifeos.job_tracker.domains.dto.request;

import java.time.Instant;
import java.util.UUID;

public record UpdateApplicationRequest(
    UUID resumeId,
    String coverLetterText,
    String notes,
    String rejectionReason,
    Instant followUpReminderDate) {}
