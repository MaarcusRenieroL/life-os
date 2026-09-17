package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.CreateMerchantRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateMerchantRequest;
import com.lifeos.finance_tracker.domains.dto.response.MerchantResponse;
import com.lifeos.finance_tracker.service.MerchantService;
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
@RequestMapping("/v1/finance/merchants")
@RequiredArgsConstructor
public class MerchantController {

  private final MerchantService merchantService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<MerchantResponse>>> getMerchants(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(merchantService.getAll(authentication), "Merchants fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<MerchantResponse>> getMerchant(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(merchantService.get(authentication, id), "Merchant fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<MerchantResponse>> createMerchant(
      Authentication authentication, @Valid @RequestBody CreateMerchantRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            merchantService.save(authentication, request), "Merchant created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<MerchantResponse>> updateMerchant(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateMerchantRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            merchantService.update(authentication, id, request), "Merchant updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteMerchant(
      Authentication authentication, @PathVariable UUID id) {
    merchantService.delete(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Merchant deleted successfully"));
  }
}
