package com.lifeos.tasks.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.tasks.domains.dto.request.CreateTaskRequest;
import com.lifeos.tasks.domains.dto.request.UpdateGoalStatusRequest;
import com.lifeos.tasks.domains.dto.request.UpdateTaskRequest;
import com.lifeos.tasks.domains.dto.response.GoalSummaryResponse;
import com.lifeos.tasks.domains.dto.response.TaskResponse;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.exception.InvalidRequestException;
import com.lifeos.tasks.service.GoalManagementService;
import com.lifeos.tasks.service.TaskService;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// The changes core's automation rules make on a user's behalf. They call the services directly
// and, unlike the user-facing controllers, publish no automation events - so a rule creating a
// task can never re-trigger rules (including itself).
@RestController
@RequestMapping("/v1/tasks/internal/automation")
@RequiredArgsConstructor
public class InternalAutomationController {

  private final TaskService taskService;
  private final GoalManagementService goalService;
  // Spring Boot 4's auto-configured mapper is Jackson 3, so a plain Jackson 2 one is used here to
  // turn the request map into the existing (getter-only) request classes - same approach as the
  // producer configs in common.
  private final ObjectMapper objectMapper =
      new ObjectMapper().findAndRegisterModules().configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

  /** Body is the same shape as a normal create-task request (title, description, priority,
   * dueDate, goalId...). */
  @PostMapping("/tasks")
  public ResponseEntity<ApiResponse<TaskResponse>> createTask(@RequestParam UUID userId, @RequestBody Map<String, Object> body) {
    CreateTaskRequest request = objectMapper.convertValue(body, CreateTaskRequest.class);
    if (request.getTitle() == null || request.getTitle().isBlank()) throw new InvalidRequestException("title is required");
    return ResponseEntity.ok(ApiResponse.success(taskService.create(userId, request), "Task created"));
  }

  /** Removes a task an automation or the email hub created - lets the candidate undo it. */
  @DeleteMapping("/tasks/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteTask(@RequestParam UUID userId, @PathVariable UUID id) {
    taskService.delete(userId, id);
    return ResponseEntity.ok(ApiResponse.success(null, "Task deleted"));
  }

  @PutMapping("/tasks/{id}/status")
  public ResponseEntity<ApiResponse<TaskResponse>> setTaskStatus(
      @RequestParam UUID userId, @PathVariable UUID id, @RequestBody Map<String, String> body) {
    TaskStatus status;
    try {
      status = TaskStatus.valueOf(String.valueOf(body.get("status")));
    } catch (IllegalArgumentException exception) {
      throw new InvalidRequestException("Unknown task status: " + body.get("status"));
    }
    TaskResponse task =
        status == TaskStatus.DONE
            ? taskService.complete(userId, id)
            : taskService.update(userId, id, objectMapper.convertValue(Map.of("status", status.name()), UpdateTaskRequest.class));
    return ResponseEntity.ok(ApiResponse.success(task, "Task updated"));
  }

  @PutMapping("/tasks/{id}/goal")
  public ResponseEntity<ApiResponse<GoalSummaryResponse>> linkTaskToGoal(
      @RequestParam UUID userId, @PathVariable UUID id, @RequestBody Map<String, String> body) {
    return ResponseEntity.ok(ApiResponse.success(goalService.linkTask(userId, UUID.fromString(body.get("goalId")), id), "Task linked"));
  }

  @PostMapping("/goals/{id}/status")
  public ResponseEntity<ApiResponse<GoalSummaryResponse>> setGoalStatus(
      @RequestParam UUID userId, @PathVariable UUID id, @RequestBody Map<String, String> body) {
    GoalStatus status;
    try {
      status = GoalStatus.valueOf(String.valueOf(body.get("status")));
    } catch (IllegalArgumentException exception) {
      throw new InvalidRequestException("Unknown goal status: " + body.get("status"));
    }
    return ResponseEntity.ok(ApiResponse.success(goalService.setStatus(userId, id, new UpdateGoalStatusRequest(status)), "Goal updated"));
  }
}
