package com.lifeos.core.automation;

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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "automation_executions", schema = "core_schema")
public class AutomationExecution {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID ruleId;

  UUID userId;

  @Enumerated(EnumType.STRING)
  ExecutionStatus status;

  String message;

  String triggerSummary;

  UUID eventId;

  @CreationTimestamp Instant executedAt;
}
