package com.lifeos.calendar.controller;

import com.lifeos.calendar.service.EventService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Called by core's cross-module goal overview via the internal API key, not by end users - same
// convention as InternalTodayController (userId as a request param since internal calls carry no
// JWT).
@RestController
@RequestMapping("/v1/calendar/internal")
@RequiredArgsConstructor
public class InternalGoalController {

  private final EventService eventService;

  @GetMapping("/goal-event-counts")
  public ResponseEntity<ApiResponse<Map<UUID, Long>>> goalEventCounts(@RequestParam UUID userId) {
    return ResponseEntity.ok(
        ApiResponse.success(eventService.upcomingEventCountsByGoal(userId), "Goal event counts fetched successfully"));
  }
}
