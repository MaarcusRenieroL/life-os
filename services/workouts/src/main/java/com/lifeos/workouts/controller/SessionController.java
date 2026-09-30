package com.lifeos.workouts.controller;

import com.lifeos.workouts.domains.dto.request.AddSetRequest;
import com.lifeos.workouts.domains.dto.request.CompleteSessionRequest;
import com.lifeos.workouts.domains.dto.request.ScheduleSessionRequest;
import com.lifeos.workouts.domains.dto.request.StartSessionRequest;
import com.lifeos.workouts.domains.dto.request.UpdateSessionRequest;
import com.lifeos.workouts.domains.dto.request.UpdateSetRequest;
import com.lifeos.workouts.domains.dto.response.SessionDetailResponse;
import com.lifeos.workouts.domains.dto.response.SessionSummaryResponse;
import com.lifeos.workouts.domains.enums.SessionStatus;
import com.lifeos.workouts.service.SessionService;
import java.time.Instant;
import com.lifeos.common.domains.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/workouts/sessions")
@RequiredArgsConstructor
public class SessionController {

  private final SessionService sessionService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<SessionSummaryResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) SessionStatus status,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to) {
    return ok(sessionService.list(userId(authentication), status, from, to), "Workouts fetched successfully");
  }

  /** The workout in progress, or null data if there isn't one. */
  @GetMapping("/current")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> current(Authentication authentication) {
    return ok(sessionService.current(userId(authentication)), "Current workout fetched successfully");
  }

  @PostMapping("/start")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> start(
      Authentication authentication, @Valid @RequestBody StartSessionRequest request) {
    return ok(sessionService.start(userId(authentication), request), "Workout started");
  }

  @PostMapping("/schedule")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> schedule(
      Authentication authentication, @Valid @RequestBody ScheduleSessionRequest request) {
    return ok(sessionService.schedule(userId(authentication), request), "Workout scheduled");
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> get(Authentication authentication, @PathVariable UUID id) {
    return ok(sessionService.get(userId(authentication), id), "Workout fetched successfully");
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody UpdateSessionRequest request) {
    return ok(sessionService.update(userId(authentication), id, request), "Workout updated successfully");
  }

  @PostMapping("/{id}/start")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> startPlanned(Authentication authentication, @PathVariable UUID id) {
    return ok(sessionService.startPlanned(userId(authentication), id), "Workout started");
  }

  @PostMapping("/{id}/complete")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> complete(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody(required = false) CompleteSessionRequest request) {
    return ok(sessionService.complete(userId(authentication), id, request), "Workout completed");
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    sessionService.delete(userId(authentication), id);
    return ok(null, "Workout deleted successfully");
  }

  @PostMapping("/{id}/sets")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> addSet(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody AddSetRequest request) {
    return ok(sessionService.addSet(userId(authentication), id, request), "Set added");
  }

  @PutMapping("/{id}/sets/{setId}")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> updateSet(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID setId, @Valid @RequestBody UpdateSetRequest request) {
    return ok(sessionService.updateSet(userId(authentication), id, setId, request), "Set updated");
  }

  @DeleteMapping("/{id}/sets/{setId}")
  public ResponseEntity<ApiResponse<SessionDetailResponse>> deleteSet(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID setId) {
    return ok(sessionService.deleteSet(userId(authentication), id, setId), "Set removed");
  }

  private static <T> ResponseEntity<ApiResponse<T>> ok(T data, String message) {
    return ResponseEntity.ok(ApiResponse.success(data, message));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
