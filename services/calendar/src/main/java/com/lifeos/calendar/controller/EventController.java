package com.lifeos.calendar.controller;

import com.lifeos.calendar.domains.dto.request.CreateEventRequest;
import com.lifeos.calendar.domains.dto.request.SetRecurrenceRequest;
import com.lifeos.calendar.domains.dto.request.SkipOccurrenceRequest;
import com.lifeos.calendar.domains.dto.request.UpdateEventRequest;
import com.lifeos.calendar.domains.dto.response.EventResponse;
import com.lifeos.calendar.domains.dto.response.FreeSlotResponse;
import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.LifeArea;
import com.lifeos.calendar.service.EventRecurrenceService;
import com.lifeos.calendar.service.EventService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/calendar/events")
@RequiredArgsConstructor
public class EventController {

  private final EventService eventService;
  private final EventRecurrenceService eventRecurrenceService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<EventResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
      @RequestParam(required = false) EventCategory category,
      @RequestParam(required = false) LifeArea area,
      @RequestParam(required = false) UUID projectId,
      @RequestParam(required = false) UUID goalId,
      @RequestParam(required = false) String q) {
    return ResponseEntity.ok(
        ApiResponse.success(
            eventService.list(userId(authentication), from, to, category, area, projectId, goalId, q),
            "Events fetched successfully"));
  }

  @GetMapping("/free-slots")
  public ResponseEntity<ApiResponse<List<FreeSlotResponse>>> freeSlots(
      Authentication authentication,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
      @RequestParam(required = false, defaultValue = "30") int minDurationMinutes,
      @RequestParam(required = false, defaultValue = "9") int dayStartHour,
      @RequestParam(required = false, defaultValue = "18") int dayEndHour) {
    return ResponseEntity.ok(
        ApiResponse.success(
            eventService.freeSlots(userId(authentication), date, minDurationMinutes, dayStartHour, dayEndHour),
            "Free slots computed"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<EventResponse>> get(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(eventService.get(userId(authentication), id), "Event fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<EventResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateEventRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(eventService.create(userId(authentication), request), "Event created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<EventResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody UpdateEventRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(eventService.update(userId(authentication), id, request), "Event updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    eventService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Event deleted successfully"));
  }

  @PostMapping("/{id}/duplicate")
  public ResponseEntity<ApiResponse<EventResponse>> duplicate(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(eventService.duplicate(userId(authentication), id), "Event duplicated"));
  }

  @GetMapping("/{id}/occurrences")
  public ResponseEntity<ApiResponse<List<EventResponse>>> occurrences(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            eventRecurrenceService.occurrences(userId(authentication), id), "Occurrences fetched successfully"));
  }

  @PostMapping("/{id}/recurrence")
  public ResponseEntity<ApiResponse<EventResponse>> setRecurrence(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SetRecurrenceRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            eventRecurrenceService.setRecurrence(userId(authentication), id, request), "Recurrence set"));
  }

  @DeleteMapping("/{id}/recurrence")
  public ResponseEntity<ApiResponse<Void>> stopRecurrence(Authentication authentication, @PathVariable UUID id) {
    eventRecurrenceService.stopRecurrence(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Recurrence stopped"));
  }

  @PostMapping("/{id}/recurrence/pause")
  public ResponseEntity<ApiResponse<EventResponse>> pauseRecurrence(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(eventRecurrenceService.pause(userId(authentication), id), "Recurrence paused"));
  }

  @PostMapping("/{id}/recurrence/resume")
  public ResponseEntity<ApiResponse<EventResponse>> resumeRecurrence(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(eventRecurrenceService.resume(userId(authentication), id), "Recurrence resumed"));
  }

  @PostMapping("/{id}/recurrence/skip")
  public ResponseEntity<ApiResponse<Void>> skipOccurrence(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SkipOccurrenceRequest request) {
    eventRecurrenceService.skipOccurrence(userId(authentication), id, request.getOccurrenceDate());
    return ResponseEntity.ok(ApiResponse.success(null, "Occurrence skipped"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
