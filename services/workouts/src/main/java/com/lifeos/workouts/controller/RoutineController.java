package com.lifeos.workouts.controller;

import com.lifeos.workouts.domains.dto.request.SaveRoutineRequest;
import com.lifeos.workouts.domains.dto.response.RoutineResponse;
import com.lifeos.workouts.service.RoutineService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/workouts/routines")
@RequiredArgsConstructor
public class RoutineController {

  private final RoutineService routineService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<RoutineResponse>>> list(Authentication authentication) {
    return ResponseEntity.ok(ApiResponse.success(routineService.list(userId(authentication)), "Routines fetched successfully"));
  }

  @GetMapping("/templates")
  public ResponseEntity<ApiResponse<List<RoutineResponse>>> templates() {
    return ResponseEntity.ok(ApiResponse.success(routineService.templates(), "Templates fetched successfully"));
  }

  @PostMapping("/templates/{id}/copy")
  public ResponseEntity<ApiResponse<RoutineResponse>> copyTemplate(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(routineService.copyTemplate(userId(authentication), id), "Template copied successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<RoutineResponse>> get(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(routineService.get(userId(authentication), id), "Routine fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<RoutineResponse>> create(
      Authentication authentication, @Valid @RequestBody SaveRoutineRequest request) {
    return ResponseEntity.ok(ApiResponse.success(routineService.create(userId(authentication), request), "Routine created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<RoutineResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SaveRoutineRequest request) {
    return ResponseEntity.ok(ApiResponse.success(routineService.update(userId(authentication), id, request), "Routine updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    routineService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Routine deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
