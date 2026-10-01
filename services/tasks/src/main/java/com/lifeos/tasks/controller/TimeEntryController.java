package com.lifeos.tasks.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.tasks.domains.dto.request.StartTimeEntryRequest;
import com.lifeos.tasks.domains.dto.response.TaskTimeSummary;
import com.lifeos.tasks.domains.dto.response.TimeEntryResponse;
import com.lifeos.tasks.service.TimeEntryService;
import jakarta.validation.Valid;
import java.time.Instant;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/tasks/time-entries")
@RequiredArgsConstructor
public class TimeEntryController {

  private final TimeEntryService timeEntryService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<TimeEntryResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
      @RequestParam(required = false) UUID taskId) {
    return ResponseEntity.ok(
        ApiResponse.success(timeEntryService.list(userId(authentication), from, to, taskId), "Time entries fetched successfully"));
  }

  @GetMapping("/active")
  public ResponseEntity<ApiResponse<TimeEntryResponse>> active(Authentication authentication) {
    return ResponseEntity.ok(ApiResponse.success(timeEntryService.active(userId(authentication)), "Active time entry fetched"));
  }

  @GetMapping("/summary")
  public ResponseEntity<ApiResponse<List<TaskTimeSummary>>> summary(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
    return ResponseEntity.ok(
        ApiResponse.success(timeEntryService.summaryByTask(userId(authentication), from, to), "Time summary fetched successfully"));
  }

  @PostMapping("/start")
  public ResponseEntity<ApiResponse<TimeEntryResponse>> start(
      Authentication authentication, @Valid @RequestBody StartTimeEntryRequest request) {
    return ResponseEntity.ok(ApiResponse.success(timeEntryService.start(userId(authentication), request), "Timer started"));
  }

  @PostMapping("/{id}/stop")
  public ResponseEntity<ApiResponse<TimeEntryResponse>> stop(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(timeEntryService.stop(userId(authentication), id), "Timer stopped"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    timeEntryService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Time entry deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
