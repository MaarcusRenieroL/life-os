package com.lifeos.habit_tracker.domains.dto.request;

import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.domains.enums.HabitType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.HashSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Partial update. A key missing from the JSON leaves that field alone; a key present with null clears it
// (so ending a habit's end date, dropping a target or a goal link really does). name, type, frequency and
// start date cannot be cleared, so null there means "unchanged".
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateHabitRequest {

  @JsonIgnore
  @Getter(AccessLevel.NONE)
  final Set<String> provided = new HashSet<>();

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

  String why;

  @Min(1)
  @Max(10)
  Integer difficulty;

  /** True when the request body contained this key at all, even as null. */
  public boolean provided(String field) {
    return provided.contains(field);
  }

  public void setName(String v) { name = v; provided.add("name"); }
  public void setDescription(String v) { description = v; provided.add("description"); }
  public void setType(HabitType v) { type = v; provided.add("type"); }
  public void setCategory(String v) { category = v; provided.add("category"); }
  public void setAreaId(UUID v) { areaId = v; provided.add("areaId"); }
  public void setGoalId(UUID v) { goalId = v; provided.add("goalId"); }
  public void setFrequencyType(FrequencyType v) { frequencyType = v; provided.add("frequencyType"); }
  public void setFrequencyConfig(Map<String, Object> v) { frequencyConfig = v; provided.add("frequencyConfig"); }
  public void setTargetValue(BigDecimal v) { targetValue = v; provided.add("targetValue"); }
  public void setTargetUnit(String v) { targetUnit = v; provided.add("targetUnit"); }
  public void setStartDate(LocalDate v) { startDate = v; provided.add("startDate"); }
  public void setEndDate(LocalDate v) { endDate = v; provided.add("endDate"); }
  public void setIcon(String v) { icon = v; provided.add("icon"); }
  public void setColor(String v) { color = v; provided.add("color"); }
  public void setPriority(Integer v) { priority = v; provided.add("priority"); }
  public void setWhy(String v) { why = v; provided.add("why"); }
  public void setDifficulty(Integer v) { difficulty = v; provided.add("difficulty"); }
}
