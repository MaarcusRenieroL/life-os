package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.record.EducationEntry;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** The candidate's contact block and summary - one row per user. Its existence is what marks
 * onboarding complete: the job-tracker module is gated until this is created. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "career_profiles", schema = "job_tracker_schema")
public class CareerProfile {

  @Id
  @Column(name = "user_id")
  UUID userId;

  @Column(name = "full_name")
  String fullName;

  String email;
  String phone;
  String location;

  @Column(name = "github_url")
  String githubUrl;

  @Column(name = "linkedin_url")
  String linkedinUrl;

  @Column(name = "portfolio_url")
  String portfolioUrl;

  String summary;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "education_json")
  List<EducationEntry> education;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "achievements_json")
  List<String> achievements;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
