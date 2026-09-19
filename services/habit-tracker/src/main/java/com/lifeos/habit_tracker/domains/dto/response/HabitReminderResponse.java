package com.lifeos.habit_tracker.domains.dto.response;

import java.time.LocalTime;
import java.util.List;
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
public class HabitReminderResponse {

  UUID id;

  UUID habitId;

  LocalTime reminderTime;

  List<Integer> daysOfWeek;

  boolean enabled;
}
