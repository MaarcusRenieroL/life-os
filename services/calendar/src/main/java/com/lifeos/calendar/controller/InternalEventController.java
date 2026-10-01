package com.lifeos.calendar.controller;

import com.lifeos.calendar.domains.dto.request.CreateEventRequest;
import com.lifeos.calendar.domains.dto.request.UpdateEventRequest;
import com.lifeos.calendar.domains.dto.response.EventResponse;
import com.lifeos.calendar.service.EventService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Lets another service create/update/delete an event on a user's behalf - e.g. job-tracker
// creating a calendar event when an interview is scheduled (see InterviewCalendarSyncService).
// Called via the internal API key, not by end users - same convention as InternalGoalController
// (userId as a request param since internal calls carry no JWT). Reuses EventService's normal
// user-scoped methods directly; the only difference from the public EventController is where
// userId comes from.
@RestController
@RequestMapping("/v1/calendar/internal")
@RequiredArgsConstructor
public class InternalEventController {

  private final EventService eventService;

  @PostMapping("/events")
  public ResponseEntity<ApiResponse<EventResponse>> create(
      @RequestParam UUID userId, @Valid @RequestBody CreateEventRequest request) {
    return ResponseEntity.ok(ApiResponse.success(eventService.create(userId, request), "Event created successfully"));
  }

  @PutMapping("/events/{id}")
  public ResponseEntity<ApiResponse<EventResponse>> update(
      @RequestParam UUID userId, @PathVariable UUID id, @Valid @RequestBody UpdateEventRequest request) {
    return ResponseEntity.ok(ApiResponse.success(eventService.update(userId, id, request), "Event updated successfully"));
  }

  @DeleteMapping("/events/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(@RequestParam UUID userId, @PathVariable UUID id) {
    eventService.delete(userId, id);
    return ResponseEntity.ok(ApiResponse.success(null, "Event deleted successfully"));
  }
}
