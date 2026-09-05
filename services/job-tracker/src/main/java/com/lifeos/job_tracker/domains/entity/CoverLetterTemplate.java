package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.CoverLetterStyle;
import com.lifeos.job_tracker.domains.enums.CoverLetterTone;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
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
import org.hibernate.type.SqlTypes;

/** {@code userId} is null for the 5 seeded system templates. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "cover_letter_templates", schema = "job_tracker_schema")
public class CoverLetterTemplate {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  String name;

  String description;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "content_structure")
  Map<String, Object> contentStructure;

  @Enumerated(EnumType.STRING)
  CoverLetterTone tone;

  @Enumerated(EnumType.STRING)
  CoverLetterStyle style;

  @Column(name = "is_public")
  boolean isPublic;

  @Column(name = "is_system")
  boolean system;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
