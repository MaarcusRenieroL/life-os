package com.lifeos.vault.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.vault.domains.dto.response.VaultBackupSnapshotResponse;
import com.lifeos.vault.service.VaultBackupService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/vault/internal")
@RequiredArgsConstructor
public class VaultBackupController {

  private final VaultBackupService vaultBackupService;

  @GetMapping("/backup-snapshot/{userId}")
  public ResponseEntity<ApiResponse<VaultBackupSnapshotResponse>> snapshot(
      @PathVariable UUID userId) {
    return ResponseEntity.ok(
        ApiResponse.success(vaultBackupService.snapshot(userId), "Backup snapshot retrieved successfully"));
  }

  @PostMapping("/backup-restore/{userId}")
  public ResponseEntity<ApiResponse<Void>> restore(
      @PathVariable UUID userId, @RequestBody VaultBackupSnapshotResponse snapshot) {
    vaultBackupService.restore(userId, snapshot);

    return ResponseEntity.ok(ApiResponse.success(null, "Vault restored successfully"));
  }
}
