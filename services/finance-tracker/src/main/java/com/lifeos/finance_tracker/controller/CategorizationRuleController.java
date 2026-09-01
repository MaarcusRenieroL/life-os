package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.CreateCategorizationRuleRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateCategorizationRuleRequest;
import com.lifeos.finance_tracker.domains.dto.response.CategorizationRuleResponse;
import com.lifeos.finance_tracker.service.CategorizationRuleService;
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
@RequestMapping("/v1/finance/categorization-rules")
@RequiredArgsConstructor
public class CategorizationRuleController {

  private final CategorizationRuleService categorizationRuleService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<CategorizationRuleResponse>>> getRules(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            categorizationRuleService.getAll(authentication), "Rules fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<CategorizationRuleResponse>> getRule(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            categorizationRuleService.get(authentication, id), "Rule fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<CategorizationRuleResponse>> createRule(
      Authentication authentication, @Valid @RequestBody CreateCategorizationRuleRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            categorizationRuleService.save(authentication, request), "Rule created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<CategorizationRuleResponse>> updateRule(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateCategorizationRuleRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            categorizationRuleService.update(authentication, id, request), "Rule updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteRule(
      Authentication authentication, @PathVariable UUID id) {
    categorizationRuleService.delete(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Rule deleted successfully"));
  }
}
