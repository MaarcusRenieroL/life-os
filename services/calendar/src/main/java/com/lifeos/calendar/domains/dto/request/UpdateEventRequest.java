package com.lifeos.calendar.domains.dto.request;

import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.FreeBusy;
import com.lifeos.calendar.domains.enums.LifeArea;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.HashSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Partial update. A key missing from the JSON leaves that field alone; a key present with null clears it
// (so removing a location, colour, goal or reminders in the UI really removes it). Drag-to-reschedule and
// resize both go through this endpoint: the frontend just PUTs new startAt/endAt (or startDate/endDate).
// title, category, allDay, freeBusy and the start/end fields cannot be cleared, so null there means "unchanged".
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateEventRequest {

  @JsonIgnore
  @Getter(AccessLevel.NONE)
  final Set<String> provided = new HashSet<>();

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

  /** True when the request body contained this key at all, even as null. */
  public boolean provided(String field) {
    return provided.contains(field);
  }

  public void setTitle(String v) { title = v; provided.add("title"); }
  public void setDescription(String v) { description = v; provided.add("description"); }
  public void setLocation(String v) { location = v; provided.add("location"); }
  public void setCategory(EventCategory v) { category = v; provided.add("category"); }
  public void setColor(String v) { color = v; provided.add("color"); }
  public void setAllDay(Boolean v) { allDay = v; provided.add("allDay"); }
  public void setStartAt(Instant v) { startAt = v; provided.add("startAt"); }
  public void setEndAt(Instant v) { endAt = v; provided.add("endAt"); }
  public void setStartDate(LocalDate v) { startDate = v; provided.add("startDate"); }
  public void setEndDate(LocalDate v) { endDate = v; provided.add("endDate"); }
  public void setFreeBusy(FreeBusy v) { freeBusy = v; provided.add("freeBusy"); }
  public void setArea(LifeArea v) { area = v; provided.add("area"); }
  public void setProjectId(UUID v) { projectId = v; provided.add("projectId"); }
  public void setGoalId(UUID v) { goalId = v; provided.add("goalId"); }
  public void setReminderMinutesBefore(List<Integer> v) { reminderMinutesBefore = v; provided.add("reminderMinutesBefore"); }
}
