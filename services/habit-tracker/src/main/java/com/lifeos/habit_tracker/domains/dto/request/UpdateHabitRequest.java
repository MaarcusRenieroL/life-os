package com.lifeos.habit_tracker.domains.dto.request;

import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Partial update - every field is optional, service only applies the ones
// that are non-null (same pattern as finance-tracker's UpdateAccountRequest).
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateHabitRequest {

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

  LocalDate startDate;

  LocalDate endDate;

  String icon;

  String color;

  Integer priority;
}
