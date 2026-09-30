package com.lifeos.calendar.service;

import com.lifeos.calendar.domains.dto.request.CreateEventRequest;
import com.lifeos.calendar.domains.dto.request.UpdateEventRequest;
import com.lifeos.calendar.domains.dto.response.EventResponse;
import com.lifeos.calendar.domains.dto.response.FreeSlotResponse;
import com.lifeos.calendar.domains.dto.response.UtilizationResponse;
import com.lifeos.calendar.domains.entity.Event;
import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.FreeBusy;
import com.lifeos.calendar.domains.enums.LifeArea;
import com.lifeos.calendar.exception.ResourceNotFoundException;
import com.lifeos.calendar.repository.EventRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class EventService {

  private final EventRepository eventRepository;

  @Transactional(readOnly = true)
  public List<EventResponse> list(
      UUID userId,
      Instant from,
      Instant to,
      EventCategory category,
      LifeArea area,
      UUID projectId,
      UUID goalId,
      String q) {
    return eventRepository.findAllByUserId(userId).stream()
        .filter(e -> overlapsRange(e, from, to))
        .filter(e -> category == null || e.getCategory() == category)
        .filter(e -> area == null || area == e.getArea())
        .filter(e -> projectId == null || projectId.equals(e.getProjectId()))
        .filter(e -> goalId == null || goalId.equals(e.getGoalId()))
        .filter(e -> matchesSearch(e, q))
        .sorted(Comparator.comparing(this::sortKey, Comparator.nullsLast(Comparator.naturalOrder())))
        .map(this::toResponse)
        .toList();
  }

  /** Both the caller's [from, to] window and every event's own range are treated as inclusive on
   * either end - an event overlaps unless it ends entirely before the window starts or starts
   * entirely after the window ends. Only applied when both from/to were given: an unbounded list
   * call (as used internally by Today) returns every event regardless of range. */
  private boolean overlapsRange(Event event, Instant from, Instant to) {
    if (from == null || to == null) return true;
    if (Boolean.TRUE.equals(event.getAllDay())) {
      LocalDate fromDate = LocalDate.ofInstant(from, java.time.ZoneOffset.UTC);
      LocalDate toDate = LocalDate.ofInstant(to, java.time.ZoneOffset.UTC);
      LocalDate start = event.getStartDate();
      LocalDate end = event.getEndDate() != null ? event.getEndDate() : start;
      return start != null && !start.isAfter(toDate) && !end.isBefore(fromDate);
    }
    Instant start = event.getStartAt();
    Instant end = event.getEndAt() != null ? event.getEndAt() : start;
    return start != null && !start.isAfter(to) && !end.isBefore(from);
  }

  private boolean matchesSearch(Event event, String q) {
    if (q == null || q.isBlank()) return true;
    String query = q.toLowerCase();
    return contains(event.getTitle(), query)
        || contains(event.getDescription(), query)
        || contains(event.getLocation(), query);
  }

  private boolean contains(String value, String query) {
    return value != null && value.toLowerCase().contains(query);
  }

  private Instant sortKey(Event event) {
    if (Boolean.TRUE.equals(event.getAllDay())) {
      return event.getStartDate() != null ? event.getStartDate().atStartOfDay(java.time.ZoneOffset.UTC).toInstant() : null;
    }
    return event.getStartAt();
  }

  /** Free-slot finder for a single day: sweeps every timed, BUSY event overlapping
   * [dayStartHour, dayEndHour) on `date` (in the server's local zone, same convention as
   * EventReminderScheduler) and returns the gaps between them that are at least
   * minDurationMinutes long. All-day events and events marked FREE don't block a slot - an
   * all-day event has no specific time to occupy, and FREE is the user's explicit "this doesn't
   * count as busy" signal. Only a single day is supported (not an arbitrary range) since the one
   * UI use case this serves - "what's open today" in the day view - never needs more, and a
   * multi-day version would need to decide how to represent per-day working windows; a reasonable
   * follow-up if a range ever becomes necessary. */
  @Transactional(readOnly = true)
  public List<FreeSlotResponse> freeSlots(UUID userId, LocalDate date, int minDurationMinutes, int dayStartHour, int dayEndHour) {
    ZoneId zone = ZoneId.systemDefault();
    Instant windowStart = date.atTime(dayStartHour, 0).atZone(zone).toInstant();
    Instant windowEnd = date.atTime(dayEndHour, 0).atZone(zone).toInstant();

    List<Event> busyEvents =
        eventRepository.findAllByUserId(userId).stream()
            .filter(e -> !Boolean.TRUE.equals(e.getAllDay()))
            .filter(e -> e.getFreeBusy() == FreeBusy.BUSY)
            .filter(e -> e.getStartAt() != null && e.getEndAt() != null)
            .filter(e -> e.getStartAt().isBefore(windowEnd) && e.getEndAt().isAfter(windowStart))
            .sorted(Comparator.comparing(Event::getStartAt))
            .toList();

    List<FreeSlotResponse> slots = new ArrayList<>();
    Instant cursor = windowStart;
    for (Event event : busyEvents) {
      Instant busyStart = event.getStartAt().isBefore(windowStart) ? windowStart : event.getStartAt();
      Instant busyEnd = event.getEndAt().isAfter(windowEnd) ? windowEnd : event.getEndAt();
      if (busyStart.isAfter(cursor)) addSlotIfLongEnough(slots, cursor, busyStart, minDurationMinutes);
      if (busyEnd.isAfter(cursor)) cursor = busyEnd;
    }
    addSlotIfLongEnough(slots, cursor, windowEnd, minDurationMinutes);
    return slots;
  }

  private void addSlotIfLongEnough(List<FreeSlotResponse> slots, Instant start, Instant end, int minDurationMinutes) {
    long minutes = Duration.between(start, end).toMinutes();
    if (minutes < minDurationMinutes) return;
    slots.add(FreeSlotResponse.builder().startAt(start).endAt(end).durationMinutes(minutes).build());
  }

  /** Sums BUSY, timed event duration in [from, to), clamped to the window at each end, broken
   * down by category and (where set) area. All-day events are excluded - they have no specific
   * duration to attribute - and FREE events are excluded for the same "doesn't count as busy"
   * reasoning as freeSlots. Unlike freeSlots this takes an arbitrary Instant range rather than a
   * single calendar day, since "how did I spend this week/month" is the natural question here. */
  @Transactional(readOnly = true)
  public UtilizationResponse utilization(UUID userId, Instant from, Instant to) {
    Map<EventCategory, Long> byCategory = new EnumMap<>(EventCategory.class);
    Map<LifeArea, Long> byArea = new HashMap<>();
    long totalMinutes = 0;

    for (Event event : eventRepository.findAllByUserId(userId)) {
      if (Boolean.TRUE.equals(event.getAllDay())) continue;
      if (event.getFreeBusy() != FreeBusy.BUSY) continue;
      if (event.getStartAt() == null || event.getEndAt() == null) continue;
      if (!overlapsRange(event, from, to)) continue;

      Instant start = event.getStartAt().isBefore(from) ? from : event.getStartAt();
      Instant end = event.getEndAt().isAfter(to) ? to : event.getEndAt();
      long minutes = Duration.between(start, end).toMinutes();
      if (minutes <= 0) continue;

      totalMinutes += minutes;
      byCategory.merge(event.getCategory(), minutes, Long::sum);
      if (event.getArea() != null) byArea.merge(event.getArea(), minutes, Long::sum);
    }

    return UtilizationResponse.builder()
        .totalMinutes(totalMinutes)
        .minutesByCategory(byCategory)
        .minutesByArea(byArea)
        .build();
  }

  @Transactional(readOnly = true)
  public EventResponse get(UUID userId, UUID id) {
    return toResponse(findOwned(userId, id));
  }

  @Transactional(readOnly = true)
  public Event findOwned(UUID userId, UUID id) {
    return eventRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Event", id));
  }

  public EventResponse create(UUID userId, CreateEventRequest request) {
    boolean allDay = request.getAllDay() != null && request.getAllDay();
    Event event =
        Event.builder()
            .userId(userId)
            .title(request.getTitle())
            .description(request.getDescription())
            .location(request.getLocation())
            .category(request.getCategory() != null ? request.getCategory() : EventCategory.OTHER)
            .color(request.getColor())
            .allDay(allDay)
            .startAt(allDay ? null : request.getStartAt())
            .endAt(allDay ? null : request.getEndAt())
            .startDate(allDay ? request.getStartDate() : null)
            .endDate(allDay ? request.getEndDate() : null)
            .freeBusy(request.getFreeBusy() != null ? request.getFreeBusy() : FreeBusy.BUSY)
            .area(request.getArea())
            .projectId(request.getProjectId())
            .goalId(request.getGoalId())
            .sourceTaskId(request.getSourceTaskId())
            .reminderMinutesBefore(Boolean.TRUE.equals(request.getAllDay()) ? null : request.getReminderMinutesBefore())
            .build();

    return toResponse(eventRepository.save(event));
  }

  public EventResponse update(UUID userId, UUID id, UpdateEventRequest request) {
    Event event = findOwned(userId, id);

    if (request.getTitle() != null) event.setTitle(request.getTitle());
    if (request.getDescription() != null) event.setDescription(request.getDescription());
    if (request.getLocation() != null) event.setLocation(request.getLocation());
    if (request.getCategory() != null) event.setCategory(request.getCategory());
    if (request.getColor() != null) event.setColor(request.getColor());
    if (request.getFreeBusy() != null) event.setFreeBusy(request.getFreeBusy());
    if (request.getArea() != null) event.setArea(request.getArea());
    if (request.getProjectId() != null) event.setProjectId(request.getProjectId());
    if (request.getGoalId() != null) event.setGoalId(request.getGoalId());
    if (request.getAllDay() != null) event.setAllDay(request.getAllDay());
    // A reschedule should let reminders fire again against the new time - mirrors tasks'
    // TaskService.applyUpdate - so clear remindersSent whenever startAt actually moves.
    boolean startMoved = request.getStartAt() != null && !request.getStartAt().equals(event.getStartAt());
    if (request.getStartAt() != null) event.setStartAt(request.getStartAt());
    if (request.getEndAt() != null) event.setEndAt(request.getEndAt());
    if (request.getStartDate() != null) event.setStartDate(request.getStartDate());
    if (request.getEndDate() != null) event.setEndDate(request.getEndDate());
    if (startMoved) event.setRemindersSent(null);
    if (request.getReminderMinutesBefore() != null) {
      event.setReminderMinutesBefore(request.getReminderMinutesBefore());
      event.setRemindersSent(null);
    }

    return toResponse(eventRepository.save(event));
  }

  public void delete(UUID userId, UUID id) {
    Event event = findOwned(userId, id);
    eventRepository.delete(event);
  }

  public EventResponse duplicate(UUID userId, UUID id) {
    Event original = findOwned(userId, id);
    Event copy =
        Event.builder()
            .userId(userId)
            .title(original.getTitle() + " (copy)")
            .description(original.getDescription())
            .location(original.getLocation())
            .category(original.getCategory())
            .color(original.getColor())
            .allDay(original.getAllDay())
            .startAt(original.getStartAt())
            .endAt(original.getEndAt())
            .startDate(original.getStartDate())
            .endDate(original.getEndDate())
            .freeBusy(original.getFreeBusy())
            .area(original.getArea())
            .projectId(original.getProjectId())
            .goalId(original.getGoalId())
            .reminderMinutesBefore(original.getReminderMinutesBefore())
            .build();
    return toResponse(eventRepository.save(copy));
  }

  EventResponse toResponse(Event event) {
    return EventResponse.builder()
        .id(event.getId())
        .title(event.getTitle())
        .description(event.getDescription())
        .location(event.getLocation())
        .category(event.getCategory())
        .color(event.getColor())
        .allDay(event.getAllDay())
        .startAt(event.getStartAt())
        .endAt(event.getEndAt())
        .startDate(event.getStartDate())
        .endDate(event.getEndDate())
        .freeBusy(event.getFreeBusy())
        .area(event.getArea())
        .projectId(event.getProjectId())
        .goalId(event.getGoalId())
        .sourceTaskId(event.getSourceTaskId())
        .recurrencePattern(event.getRecurrencePattern())
        .recurrenceConfig(event.getRecurrenceConfig())
        .recurrenceEndDate(event.getRecurrenceEndDate())
        .recurrencePaused(event.getRecurrencePaused())
        .recurrenceSkippedDates(event.getRecurrenceSkippedDates())
        .recurringParentId(event.getRecurringParentId())
        .reminderMinutesBefore(event.getReminderMinutesBefore())
        .remindersSent(event.getRemindersSent())
        .createdAt(event.getCreatedAt())
        .updatedAt(event.getUpdatedAt())
        .build();
  }
}
