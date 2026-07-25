package com.lifeos.finance_tracker.domains.entity;

import com.lifeos.finance_tracker.domains.enums.MatchField;
import com.lifeos.finance_tracker.domains.enums.MatchType;
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
@Table(name = "categorization_rules", schema = "finance_schema")
public class CategorizationRule {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  UUID categoryId;

  @Enumerated(EnumType.STRING)
  MatchType matchType;

  @Enumerated(EnumType.STRING)
  MatchField matchField;

  String matchValue;

  int priority;

  boolean isActive;

  int hitCount;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
