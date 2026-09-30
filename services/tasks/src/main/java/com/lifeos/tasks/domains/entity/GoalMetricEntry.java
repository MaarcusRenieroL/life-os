package com.lifeos.tasks.domains.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.persistence.Entity;
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
@Table(name = "goal_metric_entries", schema = "tasks_schema")
public class GoalMetricEntry {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID metricId;

  UUID userId;

  BigDecimal value;

  String note;

  LocalDate recordedOn;

  @CreationTimestamp Instant createdAt;
}
