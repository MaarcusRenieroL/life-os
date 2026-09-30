package com.lifeos.workouts.controller;

import com.lifeos.workouts.domains.dto.request.SaveExerciseRequest;
import com.lifeos.workouts.domains.dto.response.ExerciseResponse;
import com.lifeos.workouts.domains.enums.Equipment;
import com.lifeos.workouts.domains.enums.ExerciseCategory;
import com.lifeos.workouts.service.ExerciseService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/workouts/exercises")
@RequiredArgsConstructor
public class ExerciseController {

  private final ExerciseService exerciseService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ExerciseResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) ExerciseCategory category,
      @RequestParam(required = false) Equipment equipment) {
    return ResponseEntity.ok(
        ApiResponse.success(exerciseService.list(userId(authentication), q, category, equipment), "Exercises fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<ExerciseResponse>> create(
      Authentication authentication, @Valid @RequestBody SaveExerciseRequest request) {
    return ResponseEntity.ok(ApiResponse.success(exerciseService.create(userId(authentication), request), "Exercise created successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    exerciseService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Exercise deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
