package com.lifeos.tasks.domains.entity;

import com.lifeos.tasks.domains.enums.GoalMetricType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.math.BigDecimal;
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
@Table(name = "goal_metrics", schema = "tasks_schema")
public class GoalMetric {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID goalId;

  UUID userId;

  String name;

  @Enumerated(EnumType.STRING)
  GoalMetricType metricType;

  String unit;

  // Progress runs from startValue to targetValue, so a decreasing target (weight loss) works the
  // same as an increasing one (savings) - see GoalProgressCalculator#metricFraction.
  BigDecimal startValue;

  BigDecimal targetValue;

  @CreationTimestamp Instant createdAt;
}
