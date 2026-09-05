package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.InterviewRound;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InterviewRoundResponse(
    UUID id,
    UUID applicationId,
    String type,
    Instant scheduledDate,
    String interviewerName,
    String meetingLink,
    Integer durationMinutes,
    List<String> topics,
    String preparationNotes,
    String actualStatus,
    Integer selfAssessmentScore,
    String postInterviewNotes,
    Instant completedAt) {

  public static InterviewRoundResponse from(InterviewRound round) {
    return new InterviewRoundResponse(
        round.getId(),
        round.getApplicationId(),
        round.getType() == null ? null : round.getType().name(),
        round.getScheduledDate(),
        round.getInterviewerName(),
        round.getMeetingLink(),
        round.getDurationMinutes(),
        round.getTopics(),
        round.getPreparationNotes(),
        round.getActualStatus() == null ? null : round.getActualStatus().name(),
        round.getSelfAssessmentScore(),
        round.getPostInterviewNotes(),
        round.getCompletedAt());
  }
}
