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
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "cover_letters", schema = "job_tracker_schema")
public class CoverLetter {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "application_id")
  UUID applicationId;

  @Column(name = "job_listing_id")
  UUID jobListingId;

  @Column(name = "resume_variant_id")
  UUID resumeVariantId;

  /** The current live text - starts as the AI draft, becomes the user's edited version once customized. */
  @Column(name = "generated_content")
  String generatedContent;

  /** The most recent AI-generated draft, kept so "revert to generated" has something to revert to. */
  @Column(name = "custom_edits")
  String customEdits;

  @Enumerated(EnumType.STRING)
  CoverLetterTone tone;

  @Enumerated(EnumType.STRING)
  CoverLetterStyle style;

  @Column(name = "is_customized")
  boolean customized;

  @Column(name = "template_used")
  String templateUsed;

  int version;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
