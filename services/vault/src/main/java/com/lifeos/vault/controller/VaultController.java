package com.lifeos.vault.controller;

import com.lifeos.vault.domains.dto.request.CreateVaultEntryRequest;
import com.lifeos.vault.domains.dto.request.MasterPasswordRequest;
import com.lifeos.vault.domains.dto.request.UpdateMasterPasswordRequest;
import com.lifeos.vault.domains.dto.request.UpdateVaultEntryRequest;
import com.lifeos.vault.domains.dto.response.ApiResponse;
import com.lifeos.vault.domains.dto.response.VaultEntryResponse;
import com.lifeos.vault.domains.dto.response.VaultEntrySummaryResponse;
import com.lifeos.vault.domains.dto.response.VaultExportResponse;
import com.lifeos.vault.domains.dto.response.VaultStatusResponse;
import com.lifeos.vault.service.VaultEntryService;
import com.lifeos.vault.service.VaultExportService;
import com.lifeos.vault.service.VaultMasterPasswordService;
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
@RequestMapping("/v1/vault")
@RequiredArgsConstructor
public class VaultController {

  private final VaultEntryService vaultEntryService;
  private final VaultMasterPasswordService vaultMasterPasswordService;
  private final VaultExportService vaultExportService;

  @GetMapping("/status")
  public ResponseEntity<ApiResponse<VaultStatusResponse>> status(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return ResponseEntity.ok(
        ApiResponse.success(
            vaultMasterPasswordService.getStatus(userId), "Vault status fetched successfully"));
  }

  @PostMapping("/setup")
  public ResponseEntity<ApiResponse<Void>> setup(
      Authentication authentication, @RequestBody MasterPasswordRequest masterPasswordRequest) {
    UUID userId = (UUID) authentication.getPrincipal();
    vaultMasterPasswordService.setup(userId, masterPasswordRequest.getMasterPassword());

    return ResponseEntity.ok(ApiResponse.success(null, "Master password set successfully"));
  }

  @PostMapping("/verify")
  public ResponseEntity<ApiResponse<Void>> verify(
      Authentication authentication, @RequestBody MasterPasswordRequest masterPasswordRequest) {
    UUID userId = (UUID) authentication.getPrincipal();
    vaultMasterPasswordService.verify(userId, masterPasswordRequest.getMasterPassword());

    return ResponseEntity.ok(ApiResponse.success(null, "Vault unlocked successfully"));
  }

  @GetMapping("/entries")
  public ResponseEntity<ApiResponse<List<VaultEntrySummaryResponse>>> getEntries(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(
            vaultEntryService.getEntries(authentication), "Vault entries fetched successfully"));
  }

  @PostMapping("/entry")
  public ResponseEntity<ApiResponse<Void>> saveEntry(
      Authentication authentication,
      @Valid @RequestBody CreateVaultEntryRequest createVaultEntryRequest) {
    vaultEntryService.saveEntry(authentication, createVaultEntryRequest);

    return ResponseEntity.ok(ApiResponse.success(null, "Entry saved successfully"));
  }

  @GetMapping("/entry/{id}")
  public ResponseEntity<ApiResponse<VaultEntryResponse>> getEntry(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            vaultEntryService.getEntry(authentication, id), "Vault Entry fetched successfully"));
  }

  @PutMapping("/entry/{id}")
  public ResponseEntity<ApiResponse<Void>> updateEntry(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateVaultEntryRequest updateVaultEntryRequest) {
    vaultEntryService.updateEntry(authentication, id, updateVaultEntryRequest);

    return ResponseEntity.ok(ApiResponse.success(null, "Vault Entry updated successfully"));
  }

  @DeleteMapping("/entry/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteEntry(
      Authentication authentication, @PathVariable UUID id) {
    vaultEntryService.deleteEntry(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Vault Entry deleted successfully"));
  }

  @GetMapping("/export")
  public ResponseEntity<ApiResponse<VaultExportResponse>> export(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(vaultExportService.export(authentication), "Vault exported successfully"));
  }

  @PostMapping("/master-password/change")
  public ResponseEntity<ApiResponse<Void>> changeMasterPassword(
      Authentication authentication, @Valid @RequestBody UpdateMasterPasswordRequest request) {
    vaultMasterPasswordService.changePassword(
        (UUID) authentication.getPrincipal(),
        request.getCurrentPassword(),
        request.getNewPassword());
    return ResponseEntity.ok(ApiResponse.success(null, "Master password changed successfully"));
  }
}
