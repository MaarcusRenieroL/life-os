package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.JobSource;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.Seniority;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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
@Table(name = "jobs", schema = "jobs_schema")
public class Job {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String company;

  String jobTitle;

  String location;

  String country;

  @Enumerated(EnumType.STRING)
  WorkModel workModel;

  BigDecimal salaryMin;

  BigDecimal salaryMax;

  String currency;

  String jobUrl;

  String jobDescription;

  String jobDescriptionHtml;

  @Enumerated(EnumType.STRING)
  JobSource source;

  String sourceUrl;

  Instant scrapeTimestamp;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> requiredSkills;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> niceToHaveSkills;

  Integer experienceYears;

  @Enumerated(EnumType.STRING)
  Seniority seniority;

  Instant applicationDeadline;

  @Enumerated(EnumType.STRING)
  JobStatus status;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> tags;

  String notes;

  Instant savedAt;

  Instant discoveredAt;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;

  UUID deDuplicatedWithJobId;
}
