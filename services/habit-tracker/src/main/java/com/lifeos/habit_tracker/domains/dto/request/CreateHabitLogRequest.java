package com.lifeos.habit_tracker.domains.dto.request;

import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// POST .../logs is an upsert on (habitId, logDate): the service updates the
// existing row for that date in place if one already exists.
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateHabitLogRequest {

  @NotNull LocalDate logDate;

  @NotNull HabitLogStatus status;

  BigDecimal value;

  String failureReason;

  String note;
}
