package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.SectionType;
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

/**
 * One section's content within a {@link ResumeVariant}. {@code content} is always a JSON array -
 * its element shape depends on {@code sectionType} (see the per-type records in {@code
 * com.lifeos.job_tracker.domains.record.resume}).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "resume_sections", schema = "job_tracker_schema")
public class ResumeSection {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "resume_variant_id")
  UUID resumeVariantId;

  @Enumerated(EnumType.STRING)
  @Column(name = "section_type")
  SectionType sectionType;

  String title;

  @JdbcTypeCode(SqlTypes.JSON)
  List<Object> content;

  @Column(name = "sort_order")
  int sortOrder;

  @Column(name = "is_hidden")
  boolean hidden;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
