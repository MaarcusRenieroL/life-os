package com.lifeos.habit_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.habit_tracker.domains.dto.request.CreateHabitLogRequest;
import com.lifeos.habit_tracker.domains.dto.request.UpdateHabitLogRequest;
import com.lifeos.habit_tracker.domains.dto.response.HabitLogResponse;
import com.lifeos.habit_tracker.service.HabitLogService;
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
@RequestMapping("/v1/habits/{habitId}/logs")
@RequiredArgsConstructor
public class HabitLogController {

  private final HabitLogService habitLogService;

  @PostMapping
  public ResponseEntity<ApiResponse<HabitLogResponse>> upsert(
      Authentication authentication,
      @PathVariable UUID habitId,
      @Valid @RequestBody CreateHabitLogRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitLogService.upsert(userId(authentication), habitId, request),
            "Habit log saved successfully"));
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<HabitLogResponse>>> history(
      Authentication authentication,
      @PathVariable UUID habitId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitLogService.history(userId(authentication), habitId, from, to),
            "Habit log history fetched successfully"));
  }

  @PutMapping("/{logId}")
  public ResponseEntity<ApiResponse<HabitLogResponse>> update(
      Authentication authentication,
      @PathVariable UUID habitId,
      @PathVariable UUID logId,
      @RequestBody UpdateHabitLogRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitLogService.update(userId(authentication), habitId, logId, request),
            "Habit log updated successfully"));
  }

  @DeleteMapping("/{logId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID habitId, @PathVariable UUID logId) {
    habitLogService.delete(userId(authentication), habitId, logId);
    return ResponseEntity.ok(ApiResponse.success(null, "Habit log deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
