package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.CategorizationRuleType;
import com.lifeos.job_tracker.domains.enums.MatchField;
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
@Table(name = "categorization_rules", schema = "jobs_schema")
public class CategorizationRule {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String ruleName;

  @Enumerated(EnumType.STRING)
  CategorizationRuleType ruleType;

  @Enumerated(EnumType.STRING)
  MatchField matchField;

  String matchValue;

  UUID targetCategory;

  Boolean isActive;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
