package com.lifeos.tasks.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.tasks.domains.dto.request.CreateGoalRequest;
import com.lifeos.tasks.domains.dto.response.GoalResponse;
import com.lifeos.tasks.service.GoalService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A minimal named lookup so the frontend can render "link to goal" as a real searchable dropdown
 * instead of a raw UUID field - see Goal's javadoc. Exposed under /v1/tasks so calendar (and
 * anything else) can read the same list by hitting this service directly. */
@RestController
@RequestMapping("/v1/tasks/goals")
@RequiredArgsConstructor
public class GoalController {

  private final GoalService goalService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<GoalResponse>>> list(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(goalService.list(userId(authentication)), "Goals fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<GoalResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateGoalRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(goalService.create(userId(authentication), request), "Goal created successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    goalService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Goal deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
