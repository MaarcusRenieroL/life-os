package com.lifeos.calendar.domains.dto.request;

import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.FreeBusy;
import com.lifeos.calendar.domains.enums.LifeArea;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Partial update - every field is optional, service only applies the ones that are non-null (same
// pattern as tasks' UpdateTaskRequest). Drag-to-reschedule and resize both go through this same
// endpoint: the frontend just PUTs new startAt/endAt (or startDate/endDate for all-day events).
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateEventRequest {

  String title;

  String description;

  String location;

  EventCategory category;

  String color;

  Boolean allDay;

  Instant startAt;

  Instant endAt;

  LocalDate startDate;

  LocalDate endDate;

  FreeBusy freeBusy;

  LifeArea area;

  UUID projectId;

  UUID goalId;

  List<Integer> reminderMinutesBefore;
}
