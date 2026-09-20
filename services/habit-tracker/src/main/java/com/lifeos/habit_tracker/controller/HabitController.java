package com.lifeos.habit_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.habit_tracker.domains.dto.request.CreateHabitRequest;
import com.lifeos.habit_tracker.domains.dto.request.UpdateHabitRequest;
import com.lifeos.habit_tracker.domains.dto.response.ConsistencyResponse;
import com.lifeos.habit_tracker.domains.dto.response.HabitResponse;
import com.lifeos.habit_tracker.domains.dto.response.HabitStreakResponse;
import com.lifeos.habit_tracker.domains.dto.response.TodayHabitResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.service.ConsistencyService;
import com.lifeos.habit_tracker.service.HabitExportService;
import com.lifeos.habit_tracker.service.HabitService;
import com.lifeos.habit_tracker.service.StreakService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/v1/habits")
@RequiredArgsConstructor
public class HabitController {

  private final HabitService habitService;
  private final StreakService streakService;
  private final ConsistencyService consistencyService;
  private final HabitExportService habitExportService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<HabitResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) HabitStatus status,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) UUID areaId,
      @RequestParam(required = false) UUID goalId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitService.list(userId(authentication), status, category, areaId, goalId),
            "Habits fetched successfully"));
  }

  @GetMapping("/today")
  public ResponseEntity<ApiResponse<List<TodayHabitResponse>>> today(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(habitService.today(userId(authentication)), "Today's habits fetched successfully"));
  }

  @GetMapping("/export")
  public void export(
      Authentication authentication,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      HttpServletResponse response)
      throws IOException {
    response.setContentType("text/csv");
    response.setHeader(
        HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"habit-logs-export.csv\"");
    habitExportService.export(userId(authentication), from, to, response.getWriter());
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<HabitResponse>> get(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(habitService.get(userId(authentication), id), "Habit fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<HabitResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateHabitRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitService.create(userId(authentication), request), "Habit created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<HabitResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody UpdateHabitRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitService.update(userId(authentication), id, request), "Habit updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    habitService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Habit deleted successfully"));
  }

  @PostMapping("/{id}/pause")
  public ResponseEntity<ApiResponse<HabitResponse>> pause(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(habitService.pause(userId(authentication), id), "Habit paused successfully"));
  }

  @PostMapping("/{id}/resume")
  public ResponseEntity<ApiResponse<HabitResponse>> resume(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(habitService.resume(userId(authentication), id), "Habit resumed successfully"));
  }

  @GetMapping("/{id}/streak")
  public ResponseEntity<ApiResponse<HabitStreakResponse>> streak(
      Authentication authentication, @PathVariable UUID id) {
    habitService.get(userId(authentication), id);
    return ResponseEntity.ok(
        ApiResponse.success(streakService.get(id), "Streak fetched successfully"));
  }

  @GetMapping("/{id}/consistency")
  public ResponseEntity<ApiResponse<ConsistencyResponse>> consistency(
      Authentication authentication,
      @PathVariable UUID id,
      @RequestParam(defaultValue = "week") String period,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
    UUID userId = userId(authentication);
    Habit habit = habitService.findOwned(userId, id);
    return ResponseEntity.ok(
        ApiResponse.success(
            consistencyService.calculate(habit, period, asOf), "Consistency fetched successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
