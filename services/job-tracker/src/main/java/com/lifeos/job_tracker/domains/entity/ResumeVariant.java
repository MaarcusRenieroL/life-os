package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.ResumeVisibility;
import com.lifeos.job_tracker.domains.enums.StylingTemplate;
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

/** A named, styled resume document: the base upload, a tailored copy, or a hand-made variant. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "resume_variants", schema = "job_tracker_schema")
public class ResumeVariant {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  String name;

  String description;

  @Column(name = "is_base")
  boolean base;

  @Column(name = "is_public")
  boolean isPublic;

  @Enumerated(EnumType.STRING)
  ResumeVisibility visibility;

  @Enumerated(EnumType.STRING)
  @Column(name = "styling_template")
  StylingTemplate stylingTemplate;

  @Column(name = "font_family")
  String fontFamily;

  @Column(name = "accent_color")
  String accentColor;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "section_order")
  List<String> sectionOrder;

  @Column(name = "source_resume_id")
  UUID sourceResumeId;

  @Column(name = "source_job_listing_id")
  UUID sourceJobListingId;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
