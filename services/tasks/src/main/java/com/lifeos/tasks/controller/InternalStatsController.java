package com.lifeos.tasks.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.tasks.domains.dto.response.GoalSummaryResponse;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.service.GoalManagementService;
import com.lifeos.tasks.service.TaskStatsService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Read-only numbers for core's analytics, via the internal API key (userId as a request param
// since internal calls carry no JWT) - same convention as InternalGoalController.
@RestController
@RequestMapping("/v1/tasks/internal")
@RequiredArgsConstructor
public class InternalStatsController {

  private final TaskStatsService taskStatsService;
  private final GoalManagementService goalService;

  @GetMapping("/daily-stats")
  public ResponseEntity<ApiResponse<TaskStatsService.TaskStats>> dailyStats(
      @RequestParam UUID userId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) String zone) {
    ZoneId resolved = zone == null || zone.isBlank() ? ZoneId.systemDefault() : ZoneId.of(zone);
    return ResponseEntity.ok(ApiResponse.success(taskStatsService.stats(userId, from, to, resolved), "Task stats fetched"));
  }

  /** Every goal still in play with its derived progress, for goal-progress analytics and
   * overdue-goal detection. */
  @GetMapping("/goal-summaries")
  public ResponseEntity<ApiResponse<List<GoalSummaryResponse>>> goalSummaries(@RequestParam UUID userId) {
    List<GoalSummaryResponse> goals =
        goalService.list(userId, null, null, null, null, false).stream().filter(g -> g.status() != GoalStatus.ARCHIVED).toList();
    return ResponseEntity.ok(ApiResponse.success(goals, "Goal summaries fetched"));
  }
}
