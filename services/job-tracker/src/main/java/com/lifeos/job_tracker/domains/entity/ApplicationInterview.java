package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.InterviewRoundType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "application_interviews", schema = "jobs_schema")
public class ApplicationInterview {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID applicationId;

  Integer round;

  String roundName;

  @Enumerated(EnumType.STRING)
  InterviewRoundType roundType;

  Instant scheduledDate;

  LocalTime scheduledTime;

  String meetingLink;

  String interviewerName;

  String interviewerTitle;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> topics;

  String preparationNotes;

  String questionsAsked;

  String performanceReview;

  @Enumerated(EnumType.STRING)
  InterviewResult result;

  Instant resultDate;

  String feedback;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
