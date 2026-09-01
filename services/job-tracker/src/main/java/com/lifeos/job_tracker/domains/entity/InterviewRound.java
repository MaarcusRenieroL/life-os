package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.InterviewStatus;
import com.lifeos.job_tracker.domains.enums.InterviewType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
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
@Table(name = "interview_rounds", schema = "job_tracker_schema")
public class InterviewRound {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "application_id")
  UUID applicationId;

  @Enumerated(EnumType.STRING)
  InterviewType type;

  @Column(name = "scheduled_date")
  Instant scheduledDate;

  @Column(name = "interviewer_name")
  String interviewerName;

  @Column(name = "meeting_link")
  String meetingLink;

  @Column(name = "duration_minutes")
  Integer durationMinutes;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "topics_json")
  List<String> topics;

  @Column(name = "preparation_notes")
  String preparationNotes;

  @Enumerated(EnumType.STRING)
  @Column(name = "actual_status")
  InterviewStatus actualStatus;

  @Column(name = "self_assessment_score")
  Integer selfAssessmentScore;

  @Column(name = "post_interview_notes")
  String postInterviewNotes;

  @Column(name = "completed_at")
  Instant completedAt;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
