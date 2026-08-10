package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.InterviewRoundType;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateInterviewRequest {

  Integer round;

  @Size(max = 100)
  String roundName;

  InterviewRoundType roundType;

  Instant scheduledDate;

  LocalTime scheduledTime;

  @Size(max = 500)
  String meetingLink;

  @Size(max = 150)
  String interviewerName;

  @Size(max = 150)
  String interviewerTitle;

  List<String> topics;

  @Size(max = 2000)
  String preparationNotes;

  @Size(max = 2000)
  String questionsAsked;

  @Size(max = 2000)
  String performanceReview;

  InterviewResult result;

  Instant resultDate;

  @Size(max = 2000)
  String feedback;
}
