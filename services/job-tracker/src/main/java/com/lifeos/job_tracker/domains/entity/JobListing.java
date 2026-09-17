package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.CompanySize;
import com.lifeos.job_tracker.domains.enums.FitScoreSource;
import com.lifeos.job_tracker.domains.enums.GrowthStage;
import com.lifeos.job_tracker.domains.enums.IngestSource;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.domains.record.ExtractedSkill;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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
@Table(name = "job_listings", schema = "job_tracker_schema")
public class JobListing {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "company_id")
  UUID companyId;

  @Column(name = "external_id")
  String externalId;

  String title;

  String company;

  String location;

  @Enumerated(EnumType.STRING)
  @Column(name = "work_model")
  WorkModel workModel;

  String url;

  @Column(name = "job_description_text")
  String jobDescriptionText;

  String source;

  @Column(name = "salary_min")
  BigDecimal salaryMin;

  @Column(name = "salary_max")
  BigDecimal salaryMax;

  String currency;

  @Column(name = "posted_date")
  LocalDate postedDate;

  LocalDate deadline;

  @Enumerated(EnumType.STRING)
  @Column(name = "seniority_level")
  SeniorityLevel seniorityLevel;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "required_skills_json")
  List<String> requiredSkills;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "nice_to_have_skills_json")
  List<String> niceToHaveSkills;

  @Enumerated(EnumType.STRING)
  @Column(name = "visa_sponsorship")
  VisaSponsorship visaSponsorship;

  @Enumerated(EnumType.STRING)
  @Column(name = "company_size")
  CompanySize companySize;

  @Enumerated(EnumType.STRING)
  @Column(name = "growth_stage")
  GrowthStage growthStage;

  String industry;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "tags_json")
  List<String> tags;

  @Enumerated(EnumType.STRING)
  @Column(name = "parse_status")
  ProcessingStatus parseStatus;

  @Column(name = "fit_score")
  Integer fitScore;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "fit_explanation_json")
  Map<String, Object> fitExplanation;

  @Column(name = "is_saved")
  boolean saved;

  @Column(name = "is_dismissed")
  boolean dismissed;

  /** The candidate's own pipeline stage for this job. */
  @Enumerated(EnumType.STRING)
  @Column(name = "status")
  JobStatus status;

  @Column(name = "recruiter_email")
  String recruiterEmail;

  @Enumerated(EnumType.STRING)
  @Column(name = "ingested_by")
  IngestSource ingestedBy;

  @Column(name = "scraped_date")
  Instant scrapedDate;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "tailored_improvement_points_json")
  List<String> tailoredImprovementPoints;

  @Column(name = "tailored_latex_resume")
  String tailoredLatexResume;

  String notes;

  @Column(name = "applied_at")
  LocalDate appliedAt;

  @Column(name = "rejection_reason")
  String rejectionReason;

  @Column(name = "offer_amount")
  BigDecimal offerAmount;

  @Column(name = "offer_deadline")
  LocalDate offerDeadline;

  @Column(name = "offer_notes")
  String offerNotes;

  @Column(name = "cover_letter_text")
  String coverLetterText;

  @Column(name = "follow_up_at")
  LocalDate followUpAt;

  @Column(name = "override_resume_text")
  String overrideResumeText;

  @Column(name = "override_resume_file_name")
  String overrideResumeFileName;

  @Column(name = "override_resume_uploaded_at")
  Instant overrideResumeUploadedAt;

  @Enumerated(EnumType.STRING)
  @Column(name = "fit_score_source")
  FitScoreSource fitScoreSource;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "override_resume_skills_json")
  List<ExtractedSkill> overrideResumeSkills;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "tailored_resume_skills_json")
  List<ExtractedSkill> tailoredResumeSkills;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
