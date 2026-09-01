package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.CreateBudgetRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateBudgetRequest;
import com.lifeos.finance_tracker.domains.dto.response.BudgetResponse;
import com.lifeos.finance_tracker.service.BudgetService;
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
@RequestMapping("/v1/finance/budgets")
@RequiredArgsConstructor
public class BudgetController {

  private final BudgetService budgetService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<BudgetResponse>>> getBudgets(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(budgetService.getAll(authentication), "Budgets fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<BudgetResponse>> getBudget(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(budgetService.get(authentication, id), "Budget fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<BudgetResponse>> createBudget(
      Authentication authentication, @Valid @RequestBody CreateBudgetRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(budgetService.save(authentication, request), "Budget created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<BudgetResponse>> updateBudget(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateBudgetRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            budgetService.update(authentication, id, request), "Budget updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteBudget(
      Authentication authentication, @PathVariable UUID id) {
    budgetService.delete(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Budget deleted successfully"));
  }
}
