package com.lifeos.habit_tracker.domains.dto.request;

import java.time.LocalTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateHabitReminderRequest {

  LocalTime reminderTime;

  List<Integer> daysOfWeek;

  Boolean enabled;
}
