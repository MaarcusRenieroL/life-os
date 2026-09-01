package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.InterviewType;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record CreateInterviewRoundRequest(
    @NotNull InterviewType type,
    Instant scheduledDate,
    String interviewerName,
    String meetingLink,
    Integer durationMinutes,
    String preparationNotes,
    Boolean generateTopics) {}
