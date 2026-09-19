package com.lifeos.habit_tracker.domains.dto.request;

import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateHabitRequest {

  @NotBlank
  @Size(max = 500)
  String name;

  String description;

  @NotNull HabitType type;

  String category;

  UUID areaId;

  UUID goalId;

  @NotNull FrequencyType frequencyType;

  Map<String, Object> frequencyConfig;

  BigDecimal targetValue;

  String targetUnit;

  @NotNull LocalDate startDate;

  LocalDate endDate;

  String icon;

  String color;

  Integer priority;

  String why;

  @Min(1)
  @Max(10)
  Integer difficulty;
}
