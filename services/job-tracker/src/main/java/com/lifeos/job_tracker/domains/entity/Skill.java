package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.SkillCategory;
import com.lifeos.job_tracker.domains.enums.SkillProficiency;
import com.lifeos.job_tracker.domains.enums.SkillSource;
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
@Table(name = "skills", schema = "job_tracker_schema")
public class Skill {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  String name;

  @Enumerated(EnumType.STRING)
  SkillCategory category;

  @Enumerated(EnumType.STRING)
  SkillProficiency proficiency;

  @Column(name = "years_of_experience")
  BigDecimal yearsOfExperience;

  @Column(name = "confidence_score")
  BigDecimal confidenceScore;

  @Enumerated(EnumType.STRING)
  SkillSource source;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
