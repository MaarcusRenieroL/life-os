package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.automation.ActionType;
import com.lifeos.core.automation.AutomationExecution;
import com.lifeos.core.automation.AutomationRule;
import com.lifeos.core.automation.AutomationRuleService;
import com.lifeos.core.automation.AutomationTemplates;
import com.lifeos.core.automation.TriggerType;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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

@RestController
@RequestMapping("/v1/core/automation")
@RequiredArgsConstructor
public class AutomationController {

  public record RuleResponse(
      UUID id,
      String name,
      String description,
      boolean enabled,
      TriggerType triggerType,
      Map<String, Object> triggerConfig,
      ActionType actionType,
      Map<String, Object> actionConfig,
      String templateKey,
      Instant lastRunAt,
      int runCount,
      Instant createdAt) {}

  public record ExecutionResponse(UUID id, UUID ruleId, String status, String message, String triggerSummary, Instant executedAt) {}

  public record TemplateResponse(String key, String name, String description, TriggerType triggerType, Map<String, Object> triggerConfig, ActionType actionType, Map<String, Object> actionConfig) {}

  public record EnabledRequest(boolean enabled) {}

  private final AutomationRuleService ruleService;

  @GetMapping("/rules")
  public ResponseEntity<ApiResponse<List<RuleResponse>>> list(Authentication authentication) {
    return ok(ruleService.list(userId(authentication)).stream().map(this::toResponse).toList(), "Automation rules fetched");
  }

  @PostMapping("/rules")
  public ResponseEntity<ApiResponse<RuleResponse>> create(Authentication authentication, @RequestBody AutomationRuleService.SaveRule request) {
    return ok(toResponse(ruleService.create(userId(authentication), request)), "Automation rule created");
  }

  @GetMapping("/rules/{id}")
  public ResponseEntity<ApiResponse<RuleResponse>> get(Authentication authentication, @PathVariable UUID id) {
    return ok(toResponse(ruleService.get(userId(authentication), id)), "Automation rule fetched");
  }

  @PutMapping("/rules/{id}")
  public ResponseEntity<ApiResponse<RuleResponse>> update(Authentication authentication, @PathVariable UUID id, @RequestBody AutomationRuleService.SaveRule request) {
    return ok(toResponse(ruleService.update(userId(authentication), id, request)), "Automation rule updated");
  }

  @PostMapping("/rules/{id}/enabled")
  public ResponseEntity<ApiResponse<RuleResponse>> setEnabled(Authentication authentication, @PathVariable UUID id, @RequestBody EnabledRequest request) {
    return ok(toResponse(ruleService.setEnabled(userId(authentication), id, request.enabled())), request.enabled() ? "Rule enabled" : "Rule disabled");
  }

  @DeleteMapping("/rules/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    ruleService.delete(userId(authentication), id);
    return ok(null, "Automation rule deleted");
  }

  /** Runs the rule's action once, right now, with a stand-in item - for trying a rule out. */
  @PostMapping("/rules/{id}/test")
  public ResponseEntity<ApiResponse<ExecutionResponse>> test(Authentication authentication, @PathVariable UUID id) {
    return ok(toResponse(ruleService.testRun(userId(authentication), id)), "Test run finished");
  }

  @GetMapping("/executions")
  public ResponseEntity<ApiResponse<List<ExecutionResponse>>> history(
      Authentication authentication, @RequestParam(required = false) UUID ruleId, @RequestParam(defaultValue = "50") int limit) {
    return ok(ruleService.history(userId(authentication), ruleId, limit).stream().map(this::toResponse).toList(), "Execution history fetched");
  }

  @GetMapping("/templates")
  public ResponseEntity<ApiResponse<List<TemplateResponse>>> templates() {
    return ok(
        AutomationTemplates.ALL.stream()
            .map(t -> new TemplateResponse(t.key(), t.name(), t.description(), t.triggerType(), t.triggerConfig(), t.actionType(), t.actionConfig()))
            .toList(),
        "Automation templates fetched");
  }

  @PostMapping("/templates/{key}/apply")
  public ResponseEntity<ApiResponse<RuleResponse>> applyTemplate(Authentication authentication, @PathVariable String key) {
    return ok(toResponse(ruleService.createFromTemplate(userId(authentication), key)), "Rule created from template");
  }

  private RuleResponse toResponse(AutomationRule r) {
    return new RuleResponse(r.getId(), r.getName(), r.getDescription(), r.isEnabled(), r.getTriggerType(), r.getTriggerConfig(), r.getActionType(), r.getActionConfig(), r.getTemplateKey(), r.getLastRunAt(), r.getRunCount(), r.getCreatedAt());
  }

  private ExecutionResponse toResponse(AutomationExecution e) {
    return new ExecutionResponse(e.getId(), e.getRuleId(), e.getStatus().name(), e.getMessage(), e.getTriggerSummary(), e.getExecutedAt());
  }

  private static <T> ResponseEntity<ApiResponse<T>> ok(T data, String message) {
    return ResponseEntity.ok(ApiResponse.success(data, message));
  }

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
