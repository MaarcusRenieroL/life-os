package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.CreateAccountRequest;
import com.lifeos.finance_tracker.domains.dto.request.ReconcileAccountRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateAccountRequest;
import com.lifeos.finance_tracker.domains.dto.response.AccountResponse;
import com.lifeos.finance_tracker.service.AccountService;
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
@RequestMapping("/v1/finance/accounts")
@RequiredArgsConstructor
public class AccountController {

  private final AccountService accountService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<AccountResponse>>> getAccounts(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(accountService.getAll(authentication), "Accounts fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<AccountResponse>> getAccount(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            accountService.get(authentication, id), "Account fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AccountResponse>> createAccount(
      Authentication authentication, @Valid @RequestBody CreateAccountRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            accountService.save(authentication, request), "Account created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<AccountResponse>> updateAccount(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateAccountRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            accountService.update(authentication, id, request), "Account updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteAccount(
      Authentication authentication, @PathVariable UUID id) {
    accountService.delete(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Account deleted successfully"));
  }

  @PostMapping("/{id}/reconcile")
  public ResponseEntity<ApiResponse<AccountResponse>> reconcileAccount(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody ReconcileAccountRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            accountService.reconcile(authentication, id, request),
            "Account reconciled successfully"));
  }
}
