package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.UpdateRecurringPatternRequest;
import com.lifeos.finance_tracker.domains.dto.response.RecurringPatternResponse;
import com.lifeos.finance_tracker.service.RecurringPatternService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/finance/recurring-patterns")
@RequiredArgsConstructor
public class RecurringPatternController {

  private final RecurringPatternService recurringPatternService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<RecurringPatternResponse>>> getRecurringPatterns(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            recurringPatternService.getAll(authentication), "Recurring patterns fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<RecurringPatternResponse>> getRecurringPattern(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            recurringPatternService.get(authentication, id), "Recurring pattern fetched successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<RecurringPatternResponse>> updateRecurringPattern(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateRecurringPatternRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            recurringPatternService.update(authentication, id, request),
            "Recurring pattern updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteRecurringPattern(
      Authentication authentication, @PathVariable UUID id) {
    recurringPatternService.delete(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Recurring pattern dismissed successfully"));
  }
}
