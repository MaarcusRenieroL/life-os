package com.lifeos.habit_tracker.domains.dto.response;

import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.domains.enums.HabitType;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HabitResponse {

  UUID id;

  String name;

  String description;

  HabitType type;

  String category;

  UUID areaId;

  UUID goalId;

  FrequencyType frequencyType;

  Map<String, Object> frequencyConfig;

  BigDecimal targetValue;

  String targetUnit;

  HabitStatus status;

  LocalDate startDate;

  LocalDate endDate;

  String icon;

  String color;

  Integer priority;

  Instant createdAt;

  Instant updatedAt;
}
