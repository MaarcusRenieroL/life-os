package com.lifeos.workouts.controller;

import com.lifeos.workouts.domains.dto.response.GoalWorkoutStatsResponse;
import com.lifeos.workouts.service.SessionService;
import com.lifeos.workouts.service.WorkoutStatsService;
import java.util.Map;
import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Called by the Goals module (served by tasks) via the internal API key, not by end users - same
// convention as habit-tracker's InternalGoalController (userId as a request param since internal
// calls carry no JWT).
@RestController
@RequestMapping("/v1/workouts/internal")
@RequiredArgsConstructor
public class InternalGoalController {

  private final SessionService sessionService;
  private final WorkoutStatsService workoutStatsService;

  @PostMapping("/goals/{goalId}/detach")
  public ResponseEntity<ApiResponse<Integer>> detachGoal(@PathVariable UUID goalId, @RequestParam UUID userId) {
    return ResponseEntity.ok(ApiResponse.success(sessionService.detachGoal(userId, goalId), "Workouts detached from the goal"));
  }

  @GetMapping("/goal-workout-stats")
  public ResponseEntity<ApiResponse<Map<UUID, GoalWorkoutStatsResponse>>> goalWorkoutStats(@RequestParam UUID userId) {
    return ResponseEntity.ok(ApiResponse.success(sessionService.goalStats(userId), "Goal workout stats fetched successfully"));
  }

  @GetMapping("/daily-stats")
  public ResponseEntity<ApiResponse<WorkoutStatsService.WorkoutStats>> dailyStats(
      @RequestParam UUID userId,
      @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate from,
      @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate to,
      @RequestParam(required = false) String zone) {
    java.time.ZoneId resolved = zone == null || zone.isBlank() ? java.time.ZoneId.systemDefault() : java.time.ZoneId.of(zone);
    return ResponseEntity.ok(ApiResponse.success(workoutStatsService.stats(userId, from, to, resolved), "Workout stats fetched"));
  }
}
