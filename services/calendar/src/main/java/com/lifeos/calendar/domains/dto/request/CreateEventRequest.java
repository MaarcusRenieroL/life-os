package com.lifeos.calendar.domains.dto.request;

import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.FreeBusy;
import com.lifeos.calendar.domains.enums.LifeArea;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateEventRequest {

  @NotBlank
  @Size(max = 500)
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

  List<Integer> reminderMinutesBefore;
}
