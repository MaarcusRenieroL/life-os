package com.lifeos.calendar.controller;

import com.lifeos.calendar.domains.dto.request.CreateEventRequest;
import com.lifeos.calendar.domains.dto.request.UpdateEventRequest;
import com.lifeos.calendar.domains.dto.response.EventResponse;
import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.LifeArea;
import com.lifeos.calendar.service.EventService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.time.Instant;
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

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
