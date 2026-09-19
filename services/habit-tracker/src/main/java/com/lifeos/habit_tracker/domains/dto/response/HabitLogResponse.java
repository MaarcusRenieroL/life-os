package com.lifeos.habit_tracker.domains.dto.response;

import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
public class HabitLogResponse {

  UUID id;

  UUID habitId;

  LocalDate logDate;

  HabitLogStatus status;

  BigDecimal value;

  String failureReason;

  String note;

  Instant loggedAt;

  Instant updatedAt;
}
