package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.InterviewRoundType;
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

/** One interview round for a job listing - recruiter screen, technical, system design, etc. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "interviews", schema = "job_tracker_schema")
public class Interview {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "job_id")
  UUID jobId;

  @Column(name = "user_id")
  UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "round_type")
  InterviewRoundType roundType;

  @Column(name = "scheduled_at")
  Instant scheduledAt;

  @Column(name = "interviewer_name")
  String interviewerName;

  @Column(name = "meeting_link")
  String meetingLink;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "topics_json")
  List<String> topics;

  @Column(name = "preparation_notes")
  String preparationNotes;

  @Column(name = "questions_asked")
  String questionsAsked;

  @Column(name = "performance_notes")
  String performanceNotes;

  @Enumerated(EnumType.STRING)
  @Builder.Default
  InterviewResult result = InterviewResult.PENDING;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
