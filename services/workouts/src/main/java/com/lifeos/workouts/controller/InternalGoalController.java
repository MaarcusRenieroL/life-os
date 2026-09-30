package com.lifeos.workouts.controller;

import com.lifeos.workouts.domains.dto.response.GoalWorkoutStatsResponse;
import com.lifeos.workouts.service.SessionService;
import java.util.Map;
import com.lifeos.common.domains.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

// Called by the Goals module (served by tasks) via the internal API key, not by end users - same
// convention as habit-tracker's InternalGoalController (userId as a request param since internal
// calls carry no JWT).
@RestController
@RequestMapping("/v1/workouts/internal")
@RequiredArgsConstructor
public class InternalGoalController {

  private final SessionService sessionService;

  @GetMapping("/goal-workout-stats")
  public ResponseEntity<ApiResponse<Map<UUID, GoalWorkoutStatsResponse>>> goalWorkoutStats(@RequestParam UUID userId) {
    return ResponseEntity.ok(ApiResponse.success(sessionService.goalStats(userId), "Goal workout stats fetched successfully"));
  }
}
