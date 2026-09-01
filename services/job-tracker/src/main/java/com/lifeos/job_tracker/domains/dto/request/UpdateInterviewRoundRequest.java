package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.InterviewStatus;
import java.time.Instant;
import java.util.List;

public record UpdateInterviewRoundRequest(
    Instant scheduledDate,
    String interviewerName,
    String meetingLink,
    Integer durationMinutes,
    List<String> topics,
    String preparationNotes,
    InterviewStatus actualStatus,
    Integer selfAssessmentScore,
    String postInterviewNotes) {}
