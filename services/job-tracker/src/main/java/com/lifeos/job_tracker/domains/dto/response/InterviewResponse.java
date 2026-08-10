package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.InterviewRoundType;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InterviewResponse {

  UUID id;

  UUID applicationId;

  Integer round;

  String roundName;

  InterviewRoundType roundType;

  Instant scheduledDate;

  LocalTime scheduledTime;

  String meetingLink;

  String interviewerName;

  String interviewerTitle;

  List<String> topics;

  String preparationNotes;

  String questionsAsked;

  String performanceReview;

  InterviewResult result;

  Instant resultDate;

  String feedback;

  Instant createdAt;

  Instant updatedAt;
}
