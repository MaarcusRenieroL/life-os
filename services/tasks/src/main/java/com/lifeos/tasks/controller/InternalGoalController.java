package com.lifeos.tasks.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.tasks.domains.dto.response.GoalProgressResponse;
import com.lifeos.tasks.service.GoalService;
import java.util.List;
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
@RequestMapping("/v1/tasks/internal")
@RequiredArgsConstructor
public class InternalGoalController {

  private final GoalService goalService;

  @GetMapping("/goal-progress")
  public ResponseEntity<ApiResponse<List<GoalProgressResponse>>> goalProgress(@RequestParam UUID userId) {
    return ResponseEntity.ok(ApiResponse.success(goalService.goalProgress(userId), "Goal progress fetched successfully"));
  }
}
