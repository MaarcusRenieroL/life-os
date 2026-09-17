package com.lifeos.job_tracker.domains.dto.request;

import java.time.Instant;

public record UpsertInterviewRequest(
    String roundType,
    Instant scheduledAt,
    String interviewerName,
    String meetingLink,
    String preparationNotes,
    String questionsAsked,
    String performanceNotes,
    String result) {}
