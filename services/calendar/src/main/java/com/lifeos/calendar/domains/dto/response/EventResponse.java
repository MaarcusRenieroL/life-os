package com.lifeos.calendar.domains.dto.response;

import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.EventRecurrencePattern;
import com.lifeos.calendar.domains.enums.FreeBusy;
import com.lifeos.calendar.domains.enums.LifeArea;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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
public class EventResponse {

  UUID id;

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

  UUID sourceTaskId;

  EventRecurrencePattern recurrencePattern;

  Map<String, Object> recurrenceConfig;

  LocalDate recurrenceEndDate;

  Boolean recurrencePaused;

  List<LocalDate> recurrenceSkippedDates;

  UUID recurringParentId;

  Instant createdAt;

  Instant updatedAt;
}
