package com.lifeos.habit_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.habit_tracker.domains.dto.response.GoalHabitStatsResponse;
import com.lifeos.habit_tracker.service.GoalHabitStatsService;
import com.lifeos.habit_tracker.service.HabitStatsService;
import com.lifeos.habit_tracker.service.HabitService;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
  private final GoalHabitStatsService goalHabitStatsService;
  private final HabitStatsService habitStatsService;

  @GetMapping("/goal-habit-counts")
  public ResponseEntity<ApiResponse<Map<UUID, Long>>> goalHabitCounts(@RequestParam UUID userId) {
    return ResponseEntity.ok(
        ApiResponse.success(habitService.activeHabitCountsByGoal(userId), "Goal habit counts fetched successfully"));
  }

  /** The goal was deleted: habits that pointed at it keep running without one. */
  @PostMapping("/goals/{goalId}/detach")
  public ResponseEntity<ApiResponse<Integer>> detachGoal(@PathVariable UUID goalId, @RequestParam UUID userId) {
    return ResponseEntity.ok(ApiResponse.success(habitService.detachGoal(userId, goalId), "Habits detached from the goal"));
  }

  @GetMapping("/goal-habit-stats")
  public ResponseEntity<ApiResponse<Map<UUID, GoalHabitStatsResponse>>> goalHabitStats(
      @RequestParam UUID userId) {
    return ResponseEntity.ok(
        ApiResponse.success(goalHabitStatsService.statsByGoal(userId), "Goal habit stats fetched successfully"));
  }

  @GetMapping("/daily-stats")
  public ResponseEntity<ApiResponse<HabitStatsService.HabitStats>> dailyStats(
      @RequestParam UUID userId,
      @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate from,
      @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate to) {
    return ResponseEntity.ok(ApiResponse.success(habitStatsService.stats(userId, from, to), "Habit stats fetched successfully"));
  }
}
