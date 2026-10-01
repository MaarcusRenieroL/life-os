package com.lifeos.tasks.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.events.AutomationEventPublisher;
import com.lifeos.common.events.AutomationEventRecord;
import com.lifeos.tasks.domains.dto.request.CreateGoalLinkRequest;
import com.lifeos.tasks.domains.dto.request.LogMetricEntryRequest;
import com.lifeos.tasks.domains.dto.request.SaveGoalRequest;
import com.lifeos.tasks.domains.dto.request.SaveMetricRequest;
import com.lifeos.tasks.domains.dto.request.SaveMilestoneRequest;
import com.lifeos.tasks.domains.dto.request.SubmitGoalReviewRequest;
import com.lifeos.tasks.domains.dto.request.UpdateGoalStatusRequest;
import com.lifeos.tasks.domains.dto.response.GoalDetailResponse;
import com.lifeos.tasks.domains.dto.response.GoalMetricEntryResponse;
import com.lifeos.tasks.domains.dto.response.GoalMetricResponse;
import com.lifeos.tasks.domains.dto.response.GoalMilestoneResponse;
import com.lifeos.tasks.domains.dto.response.GoalReviewResponse;
import com.lifeos.tasks.domains.dto.response.GoalSummaryResponse;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.domains.enums.LifeArea;
import com.lifeos.tasks.service.GoalItemsService;
import com.lifeos.tasks.service.GoalManagementService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The full Goals module API. Distinct from GoalController (/v1/tasks/goals), which stays as the
 * name-only lookup the task and calendar pickers use. Served by this service but routed at
 * /v1/goals so the URL matches the module. */
@RestController
@RequestMapping("/v1/goals")
@RequiredArgsConstructor
public class GoalModuleController {

  private final GoalManagementService goalService;
  private final GoalItemsService itemsService;
  private final AutomationEventPublisher automationEvents;

  @GetMapping
  public ResponseEntity<ApiResponse<List<GoalSummaryResponse>>> list(
      Authentication authentication,
      @RequestParam(required = false) LifeArea area,
      @RequestParam(required = false) GoalStatus status,
      @RequestParam(required = false) Integer priority,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "false") boolean includeArchived) {
    return ok(goalService.list(userId(authentication), area, status, priority, q, includeArchived), "Goals fetched successfully");
  }

  @PostMapping
  public ResponseEntity<ApiResponse<GoalSummaryResponse>> create(
      Authentication authentication, @Valid @RequestBody SaveGoalRequest request) {
    GoalSummaryResponse created = goalService.create(userId(authentication), request);
    publish(authentication, created, AutomationEventRecord.Kind.CREATED);
    return ok(created, "Goal created successfully");
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<GoalDetailResponse>> detail(Authentication authentication, @PathVariable UUID id) {
    return ok(goalService.detail(userId(authentication), id), "Goal fetched successfully");
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<GoalSummaryResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SaveGoalRequest request) {
    GoalSummaryResponse updated = goalService.update(userId(authentication), id, request);
    publish(authentication, updated, AutomationEventRecord.Kind.UPDATED);
    return ok(updated, "Goal updated successfully");
  }

  @PostMapping("/{id}/status")
  public ResponseEntity<ApiResponse<GoalSummaryResponse>> setStatus(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody UpdateGoalStatusRequest request) {
    GoalSummaryResponse changed = goalService.setStatus(userId(authentication), id, request);
    publish(authentication, changed, request.status() == GoalStatus.COMPLETED ? AutomationEventRecord.Kind.COMPLETED : AutomationEventRecord.Kind.UPDATED);
    return ok(changed, "Goal status updated successfully");
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    goalService.delete(userId(authentication), id);
    return ok(null, "Goal deleted successfully");
  }

  // ---- linked tasks ----

  @PutMapping("/{id}/tasks/{taskId}")
  public ResponseEntity<ApiResponse<GoalSummaryResponse>> linkTask(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID taskId) {
    return ok(goalService.linkTask(userId(authentication), id, taskId), "Task linked successfully");
  }

  @DeleteMapping("/{id}/tasks/{taskId}")
  public ResponseEntity<ApiResponse<GoalSummaryResponse>> unlinkTask(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID taskId) {
    return ok(goalService.unlinkTask(userId(authentication), id, taskId), "Task unlinked successfully");
  }

  // ---- milestones ----

  @PostMapping("/{id}/milestones")
  public ResponseEntity<ApiResponse<GoalMilestoneResponse>> addMilestone(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SaveMilestoneRequest request) {
    return ok(itemsService.addMilestone(userId(authentication), id, request), "Milestone added successfully");
  }

  @PutMapping("/{id}/milestones/{milestoneId}")
  public ResponseEntity<ApiResponse<GoalMilestoneResponse>> updateMilestone(
      Authentication authentication,
      @PathVariable UUID id,
      @PathVariable UUID milestoneId,
      @Valid @RequestBody SaveMilestoneRequest request) {
    return ok(itemsService.updateMilestone(userId(authentication), id, milestoneId, request), "Milestone updated successfully");
  }

  @DeleteMapping("/{id}/milestones/{milestoneId}")
  public ResponseEntity<ApiResponse<Void>> deleteMilestone(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID milestoneId) {
    itemsService.deleteMilestone(userId(authentication), id, milestoneId);
    return ok(null, "Milestone deleted successfully");
  }

  // ---- metrics ----

  @PostMapping("/{id}/metrics")
  public ResponseEntity<ApiResponse<GoalMetricResponse>> addMetric(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SaveMetricRequest request) {
    return ok(itemsService.addMetric(userId(authentication), id, request), "Metric added successfully");
  }

  @PutMapping("/{id}/metrics/{metricId}")
  public ResponseEntity<ApiResponse<GoalMetricResponse>> updateMetric(
      Authentication authentication,
      @PathVariable UUID id,
      @PathVariable UUID metricId,
      @Valid @RequestBody SaveMetricRequest request) {
    return ok(itemsService.updateMetric(userId(authentication), id, metricId, request), "Metric updated successfully");
  }

  @DeleteMapping("/{id}/metrics/{metricId}")
  public ResponseEntity<ApiResponse<Void>> deleteMetric(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID metricId) {
    itemsService.deleteMetric(userId(authentication), id, metricId);
    return ok(null, "Metric deleted successfully");
  }

  @GetMapping("/{id}/metrics/{metricId}/entries")
  public ResponseEntity<ApiResponse<List<GoalMetricEntryResponse>>> entries(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID metricId) {
    return ok(itemsService.entries(userId(authentication), id, metricId), "Metric entries fetched successfully");
  }

  @PostMapping("/{id}/metrics/{metricId}/entries")
  public ResponseEntity<ApiResponse<GoalMetricResponse>> logEntry(
      Authentication authentication,
      @PathVariable UUID id,
      @PathVariable UUID metricId,
      @Valid @RequestBody LogMetricEntryRequest request) {
    return ok(itemsService.logEntry(userId(authentication), id, metricId, request), "Entry logged successfully");
  }

  @DeleteMapping("/{id}/metrics/{metricId}/entries/{entryId}")
  public ResponseEntity<ApiResponse<GoalMetricResponse>> deleteEntry(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID metricId, @PathVariable UUID entryId) {
    return ok(itemsService.deleteEntry(userId(authentication), id, metricId, entryId), "Entry deleted successfully");
  }

  // ---- links to other goals ----

  @PostMapping("/{id}/links")
  public ResponseEntity<ApiResponse<Void>> addLink(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody CreateGoalLinkRequest request) {
    itemsService.addLink(userId(authentication), id, request);
    return ok(null, "Goals linked successfully");
  }

  @DeleteMapping("/{id}/links/{linkId}")
  public ResponseEntity<ApiResponse<Void>> deleteLink(
      Authentication authentication, @PathVariable UUID id, @PathVariable UUID linkId) {
    itemsService.deleteLink(userId(authentication), id, linkId);
    return ok(null, "Link removed successfully");
  }

  // ---- reviews ----

  @PostMapping("/{id}/reviews")
  public ResponseEntity<ApiResponse<GoalReviewResponse>> submitReview(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody SubmitGoalReviewRequest request) {
    return ok(itemsService.submitReview(userId(authentication), id, request), "Review saved successfully");
  }

  // Published from the controller, not the service, so automation's own changes through the
  // internal endpoints never re-trigger rules.
  private void publish(Authentication authentication, GoalSummaryResponse goal, AutomationEventRecord.Kind kind) {
    java.util.Map<String, String> attributes = new java.util.HashMap<>();
    attributes.put("status", goal.status().name());
    attributes.put("priority", String.valueOf(goal.priority()));
    if (goal.area() != null) attributes.put("area", goal.area().name());
    automationEvents.publish(userId(authentication), "GOAL", goal.id(), kind, goal.name(), attributes);
  }

  private static <T> ResponseEntity<ApiResponse<T>> ok(T data, String message) {
    return ResponseEntity.ok(ApiResponse.success(data, message));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
