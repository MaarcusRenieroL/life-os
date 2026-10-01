package com.lifeos.core.automation;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
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
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "automation_rules", schema = "core_schema")
public class AutomationRule {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String name;

  String description;

  @Builder.Default boolean enabled = true;

  @Enumerated(EnumType.STRING)
  TriggerType triggerType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  Map<String, Object> triggerConfig;

  @Enumerated(EnumType.STRING)
  ActionType actionType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  Map<String, Object> actionConfig;

  String templateKey;

  boolean thresholdActive;

  Instant lastRunAt;

  int runCount;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
