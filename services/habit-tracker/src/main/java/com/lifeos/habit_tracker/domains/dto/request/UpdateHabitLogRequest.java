package com.lifeos.habit_tracker.domains.dto.request;

import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateHabitLogRequest {

  HabitLogStatus status;

  BigDecimal value;

  String failureReason;

  String note;
}
