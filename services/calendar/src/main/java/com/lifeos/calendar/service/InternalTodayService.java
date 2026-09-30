package com.lifeos.calendar.service;

import com.lifeos.calendar.domains.entity.Event;
import com.lifeos.calendar.repository.EventRepository;
import com.lifeos.common.domains.dto.response.TodayItemResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Backs the internal {@code /v1/calendar/internal/today} endpoint that core's cross-module Today
 * aggregation calls once per Today-view page load (see {@link
 * com.lifeos.calendar.controller.InternalTodayController}). Returns the shared {@link
 * TodayItemResponse} shape, matching every other module's internal Today endpoint.
 */
@Service
@RequiredArgsConstructor
public class InternalTodayService {

  private final EventRepository eventRepository;

  @Transactional(readOnly = true)
  public List<TodayItemResponse> today(UUID userId) {
    LocalDate today = LocalDate.now();
    ZoneId zone = ZoneId.systemDefault();
    Instant startOfDay = today.atStartOfDay(zone).toInstant();
    Instant endOfDay = today.atTime(LocalTime.MAX).atZone(zone).toInstant();

    return eventRepository.findAllByUserId(userId).stream()
        .filter(e -> isToday(e, today, startOfDay, endOfDay))
        .map(this::toItem)
        .toList();
  }

  private boolean isToday(Event event, LocalDate today, Instant startOfDay, Instant endOfDay) {
    if (Boolean.TRUE.equals(event.getAllDay())) {
      LocalDate start = event.getStartDate();
      LocalDate end = event.getEndDate() != null ? event.getEndDate() : start;
      return start != null && !start.isAfter(today) && !end.isBefore(today);
    }
    Instant start = event.getStartAt();
    Instant end = event.getEndAt() != null ? event.getEndAt() : start;
    return start != null && !start.isAfter(endOfDay) && !end.isBefore(startOfDay);
  }

  private TodayItemResponse toItem(Event event) {
    return TodayItemResponse.builder()
        .module("calendar")
        .type("event_today")
        .title(event.getTitle())
        .description(event.getLocation())
        .dueAt(event.getStartAt())
        .entityId(event.getId().toString())
        .priority("info")
        .build();
  }
}
