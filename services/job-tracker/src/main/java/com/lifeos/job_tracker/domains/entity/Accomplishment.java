package com.lifeos.job_tracker.domains.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import org.hibernate.type.SqlTypes;

/** A reusable achievement bullet, searchable across all of a user's resume variants. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "accomplishments", schema = "job_tracker_schema")
public class Accomplishment {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  String category;

  @Column(name = "bullet_text")
  String bulletText;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> keywords;

  @Column(name = "source_section_id")
  UUID sourceSectionId;

  @Column(name = "usage_count")
  int usageCount;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
