package com.lifeos.habit_tracker.domains.entity;

import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.domains.enums.HabitType;
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
import java.time.LocalDate;
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
@Table(name = "habits", schema = "habit_tracker_schema")
public class Habit {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String name;

  String description;

  @Enumerated(EnumType.STRING)
  HabitType type;

  String category;

  // No FK/relationship - this is a stored reference to a row owned by
  // another module/schema (life areas), never joined against here.
  UUID areaId;

  // Same as areaId: a stored reference to a goal owned by another module.
  UUID goalId;

  @Enumerated(EnumType.STRING)
  FrequencyType frequencyType;

  // Shape depends on frequencyType:
  //  - WEEKLY_DAYS: {"daysOfWeek": [1,3,5]}  (ISO-8601 day-of-week, 1=Monday..7=Sunday)
  //  - X_PER_WEEK: {"timesPerWeek": 3}
  //  - X_PER_MONTH: {"timesPerMonth": 10}
  //  - CUSTOM_INTERVAL: {"intervalDays": 3}  (every Nth day counting from startDate)
  //  - DAILY: unused, may be null
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  Map<String, Object> frequencyConfig;

  BigDecimal targetValue;

  String targetUnit;

  @Enumerated(EnumType.STRING)
  @Builder.Default
  HabitStatus status = HabitStatus.ACTIVE;

  LocalDate startDate;

  LocalDate endDate;

  String icon;

  String color;

  Integer priority;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
