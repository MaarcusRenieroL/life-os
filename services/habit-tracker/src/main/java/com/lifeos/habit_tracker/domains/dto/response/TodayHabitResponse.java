package com.lifeos.habit_tracker.domains.dto.response;

import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
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
public class TodayHabitResponse {

  HabitResponse habit;

  // Null status is the "not logged yet today" sentinel, distinct from any
  // real HabitLogStatus value.
  HabitLogStatus todayStatus;

  HabitLogResponse todayLog;
}
