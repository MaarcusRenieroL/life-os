package com.lifeos.workouts.controller;

import com.lifeos.workouts.domains.dto.response.WorkoutAnalyticsResponse;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.service.WorkoutAnalyticsService;
import java.time.DateTimeException;
import java.time.ZoneId;
import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/workouts/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

  private final WorkoutAnalyticsService analyticsService;

  /** zone is an IANA id (the browser's) so weeks roll over at the user's midnight, not the server's. */
  @GetMapping
  public ResponseEntity<ApiResponse<WorkoutAnalyticsResponse>> analytics(
      Authentication authentication,
      @RequestParam(defaultValue = "12") int weeks,
      @RequestParam(defaultValue = "3") int target,
      @RequestParam(required = false) String zone) {
    ZoneId resolved;
    try {
      resolved = zone == null || zone.isBlank() ? ZoneId.systemDefault() : ZoneId.of(zone);
    } catch (DateTimeException exception) {
      throw new InvalidRequestException("Unknown time zone: " + zone);
    }
    return ResponseEntity.ok(
        ApiResponse.success(analyticsService.analytics((UUID) authentication.getPrincipal(), weeks, target, resolved), "Analytics fetched successfully"));
  }
}
