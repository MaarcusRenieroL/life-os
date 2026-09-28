package com.lifeos.habit_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.habit_tracker.service.HabitService;
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
@RequestMapping("/v1/habits/internal")
@RequiredArgsConstructor
public class InternalGoalController {

  private final HabitService habitService;

  @GetMapping("/goal-habit-counts")
  public ResponseEntity<ApiResponse<Map<UUID, Long>>> goalHabitCounts(@RequestParam UUID userId) {
    return ResponseEntity.ok(
        ApiResponse.success(habitService.activeHabitCountsByGoal(userId), "Goal habit counts fetched successfully"));
  }
}
