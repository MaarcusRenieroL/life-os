package com.lifeos.job_tracker.domains.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
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
@Table(name = "company_intelligence", schema = "jobs_schema")
public class CompanyIntelligence {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  String companyName;

  String companyWebsite;

  String linkedinProfileUrl;

  Integer foundedYear;

  String headquarters;

  String employeeCount;

  String industry;

  String summary;

  BigDecimal glassdoorRating;

  Integer glassdoorReviewCount;

  String blindSentiment;

  String interviewDifficulty;

  String averageInterviewDuration;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> commonRoundTypes;

  @JdbcTypeCode(SqlTypes.JSON)
  Map<String, Object> reviewsData;

  @JdbcTypeCode(SqlTypes.JSON)
  Map<String, Object> financialData;

  @JdbcTypeCode(SqlTypes.JSON)
  Map<String, Object> teamData;

  Instant scrapedAt;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant lastUpdatedAt;
}
