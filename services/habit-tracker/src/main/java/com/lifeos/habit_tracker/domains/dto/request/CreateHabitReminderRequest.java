package com.lifeos.habit_tracker.domains.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateHabitReminderRequest {

  @NotNull LocalTime reminderTime;

  List<Integer> daysOfWeek;

  Boolean enabled;
}
