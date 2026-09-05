package com.lifeos.job_tracker.domains.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A resume styling/layout preset. 5 are seeded by the migration (is_system=true). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "resume_templates", schema = "job_tracker_schema")
public class ResumeTemplate {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  String name;

  String description;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "styling_config")
  Map<String, Object> stylingConfig;

  /** Ordered list of section-type names, e.g. ["summary","experience","skills"]. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "section_layout")
  List<String> sectionLayout;

  @Column(name = "is_system")
  boolean system;
}
