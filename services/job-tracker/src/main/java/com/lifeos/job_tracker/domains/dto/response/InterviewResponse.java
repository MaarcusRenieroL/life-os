package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Interview;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InterviewResponse(
    UUID id,
    UUID jobId,
    String roundType,
    Instant scheduledAt,
    String interviewerName,
    String meetingLink,
    List<String> topics,
    String preparationNotes,
    String questionsAsked,
    String performanceNotes,
    String result,
    Instant createdAt) {

  public static InterviewResponse from(Interview interview) {
    return new InterviewResponse(
        interview.getId(),
        interview.getJobId(),
        interview.getRoundType() == null ? null : interview.getRoundType().name(),
        interview.getScheduledAt(),
        interview.getInterviewerName(),
        interview.getMeetingLink(),
        interview.getTopics(),
        interview.getPreparationNotes(),
        interview.getQuestionsAsked(),
        interview.getPerformanceNotes(),
        interview.getResult() == null ? null : interview.getResult().name(),
        interview.getCreatedAt());
  }
}
