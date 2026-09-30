package com.lifeos.workouts.controller;

import com.lifeos.workouts.domains.dto.request.SaveMeasurementRequest;
import com.lifeos.workouts.domains.dto.response.MeasurementResponse;
import com.lifeos.workouts.service.MeasurementService;
import java.time.LocalDate;
import com.lifeos.common.domains.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/workouts/measurements")
@RequiredArgsConstructor
public class MeasurementController {

  private final MeasurementService measurementService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<MeasurementResponse>>> list(
      Authentication authentication, @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to) {
    return ResponseEntity.ok(ApiResponse.success(measurementService.list(userId(authentication), from, to), "Measurements fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<MeasurementResponse>> create(
      Authentication authentication, @Valid @RequestBody SaveMeasurementRequest request) {
    return ResponseEntity.ok(ApiResponse.success(measurementService.create(userId(authentication), request), "Measurement saved successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<MeasurementResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SaveMeasurementRequest request) {
    return ResponseEntity.ok(ApiResponse.success(measurementService.update(userId(authentication), id, request), "Measurement updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    measurementService.delete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Measurement deleted successfully"));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
