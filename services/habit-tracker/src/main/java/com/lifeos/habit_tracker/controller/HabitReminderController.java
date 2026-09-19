package com.lifeos.habit_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.habit_tracker.domains.dto.request.CreateHabitReminderRequest;
import com.lifeos.habit_tracker.domains.dto.request.UpdateHabitReminderRequest;
import com.lifeos.habit_tracker.domains.dto.response.HabitReminderResponse;
import com.lifeos.habit_tracker.service.HabitReminderService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/habits/{habitId}/reminders")
@RequiredArgsConstructor
public class HabitReminderController {

  private final HabitReminderService habitReminderService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<HabitReminderResponse>>> list(
      Authentication authentication, @PathVariable UUID habitId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitReminderService.list(userId(authentication), habitId),
            "Reminders fetched successfully"));
  }

  @GetMapping("/{reminderId}")
  public ResponseEntity<ApiResponse<HabitReminderResponse>> get(
      Authentication authentication, @PathVariable UUID habitId, @PathVariable UUID reminderId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitReminderService.get(userId(authentication), habitId, reminderId),
            "Reminder fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<HabitReminderResponse>> create(
      Authentication authentication,
      @PathVariable UUID habitId,
      @Valid @RequestBody CreateHabitReminderRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitReminderService.create(userId(authentication), habitId, request),
            "Reminder created successfully"));
  }

  @PutMapping("/{reminderId}")
  public ResponseEntity<ApiResponse<HabitReminderResponse>> update(
      Authentication authentication,
      @PathVariable UUID habitId,
      @PathVariable UUID reminderId,
      @RequestBody UpdateHabitReminderRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            habitReminderService.update(userId(authentication), habitId, reminderId, request),
            "Reminder updated successfully"));
  }

  @DeleteMapping("/{reminderId}")
  public ResponseEntity<ApiResponse<Void>> delete(
      Authentication authentication, @PathVariable UUID habitId, @PathVariable UUID reminderId) {
    habitReminderService.delete(userId(authentication), habitId, reminderId);
    return ResponseEntity.ok(ApiResponse.success(null, "Reminder deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
