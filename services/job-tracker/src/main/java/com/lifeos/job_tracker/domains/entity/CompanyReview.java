package com.lifeos.job_tracker.domains.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "company_reviews", schema = "jobs_schema")
public class CompanyReview {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID companyId;

  String source;

  String reviewText;

  BigDecimal rating;

  String title;

  String pros;

  String cons;

  String interviewExperience;

  String salary;

  String role;

  Instant scrapedAt;

  @CreationTimestamp Instant createdAt;
}
