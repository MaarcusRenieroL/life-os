package com.lifeos.tasks.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.tasks.domains.dto.request.BulkUpdateTaskRequest;
import com.lifeos.tasks.domains.dto.request.CreateTaskRequest;
import com.lifeos.tasks.domains.dto.request.SnoozeTaskRequest;
import com.lifeos.tasks.domains.dto.request.UpdateTaskRequest;
import com.lifeos.tasks.domains.dto.response.TaskResponse;
import com.lifeos.tasks.domains.enums.LifeArea;
import com.lifeos.tasks.domains.enums.TaskPriority;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.domains.enums.TaskView;
import com.lifeos.tasks.service.TaskService;
import jakarta.validation.Valid;
import java.time.LocalDate;
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
@RequestMapping("/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

  private final TaskService taskService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<TaskResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) TaskView view,
      @RequestParam(required = false) TaskStatus status,
      @RequestParam(required = false) TaskPriority priority,
      @RequestParam(required = false) LifeArea area,
      @RequestParam(required = false) UUID projectId,
      @RequestParam(required = false) UUID goalId,
      @RequestParam(required = false) String tag,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Integer upcomingDays,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueFrom,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueTo) {
    return ResponseEntity.ok(
        ApiResponse.success(
            taskService.list(
                userId(authentication), view, status, priority, area, projectId, goalId, tag, q, upcomingDays,
                dueFrom, dueTo),
            "Tasks fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<TaskResponse>> get(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(taskService.get(userId(authentication), id), "Task fetched successfully"));
  }

  @GetMapping("/{id}/subtasks")
  public ResponseEntity<ApiResponse<List<TaskResponse>>> subtasks(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(taskService.subtasks(userId(authentication), id), "Subtasks fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<TaskResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateTaskRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(taskService.create(userId(authentication), request), "Task created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<TaskResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody UpdateTaskRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(taskService.update(userId(authentication), id, request), "Task updated successfully"));
  }

  @PutMapping("/bulk")
  public ResponseEntity<ApiResponse<List<TaskResponse>>> bulkUpdate(
      Authentication authentication, @Valid @RequestBody BulkUpdateTaskRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(taskService.bulkUpdate(userId(authentication), request), "Tasks updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    taskService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Task deleted successfully"));
  }

  @PostMapping("/{id}/complete")
  public ResponseEntity<ApiResponse<TaskResponse>> complete(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(taskService.complete(userId(authentication), id), "Task marked done"));
  }

  @PostMapping("/{id}/reopen")
  public ResponseEntity<ApiResponse<TaskResponse>> reopen(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(taskService.reopen(userId(authentication), id), "Task reopened"));
  }

  @PostMapping("/{id}/snooze")
  public ResponseEntity<ApiResponse<TaskResponse>> snooze(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SnoozeTaskRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(taskService.snooze(userId(authentication), id, request), "Task snoozed"));
  }

  @PostMapping("/{id}/duplicate")
  public ResponseEntity<ApiResponse<TaskResponse>> duplicate(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(taskService.duplicate(userId(authentication), id), "Task duplicated"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
