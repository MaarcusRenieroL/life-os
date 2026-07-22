package com.lifeos.vault.controller;

import com.lifeos.vault.domains.dto.request.CreateVaultCategoryRequest;
import com.lifeos.vault.domains.dto.request.UpdateVaultCategoryRequest;
import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.vault.domains.dto.response.VaultCategoryResponse;
import com.lifeos.vault.service.VaultCategoryService;
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
@RequestMapping("/v1/vault/categories")
@RequiredArgsConstructor
public class VaultCategoryController {

  private final VaultCategoryService vaultCategoryService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<VaultCategoryResponse>>> getCategories(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            vaultCategoryService.getCategories(authentication),
            "Vault categories fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<VaultCategoryResponse>> createCategory(
      Authentication authentication, @Valid @RequestBody CreateVaultCategoryRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            vaultCategoryService.createCategory(authentication, request),
            "Vault category created successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<VaultCategoryResponse>> getCategory(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            vaultCategoryService.getCategory(authentication, id),
            "Vault category fetched successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<VaultCategoryResponse>> updateCategory(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateVaultCategoryRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            vaultCategoryService.updateCategory(authentication, id, request),
            "Vault category updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteCategory(
      Authentication authentication, @PathVariable UUID id) {
    vaultCategoryService.deleteCategory(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Vault category deleted successfully"));
  }
}
