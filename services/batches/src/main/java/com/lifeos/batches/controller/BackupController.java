package com.lifeos.batches.controller;

import com.lifeos.batches.config.VaultBackupClient;
import com.lifeos.batches.domains.entity.VaultBackup;
import com.lifeos.batches.exception.VaultBackupNotFoundException;
import com.lifeos.batches.repository.VaultBackupRepository;
import com.lifeos.common.domains.dto.response.ApiResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.parameters.JobParameters;
import org.springframework.batch.core.job.parameters.JobParametersBuilder;
import org.springframework.batch.core.launch.JobOperator;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/batches/backup")
@RequiredArgsConstructor
public class BackupController {

  private final JobOperator jobOperator;
  private final Job vaultBackupJob;

  private final VaultBackupRepository vaultBackupRepository;

  private final VaultBackupClient vaultBackupClient;

  @PostMapping("/run")
  public ResponseEntity<ApiResponse<Void>> runBackup(Authentication authentication)
      throws Exception {
    UUID userId = (UUID) authentication.getPrincipal();

    JobParameters params =
        new JobParametersBuilder()
            .addString("userId", userId.toString())
            .addLong("timestamp", System.currentTimeMillis())
            .toJobParameters();

    jobOperator.start(vaultBackupJob, params);

    return ResponseEntity.ok(ApiResponse.success(null, "Backup Started"));
  }

  @PostMapping("/restore")
  public ResponseEntity<ApiResponse<Void>> restoreBackup(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    VaultBackup latestBackup =
        vaultBackupRepository
            .findFirstByUserIdOrderByCreatedAtDesc(userId)
            .orElseThrow(() -> new VaultBackupNotFoundException(userId));

    vaultBackupClient.restoreSnapshot(userId, latestBackup.getSnapshot());

    return ResponseEntity.ok(ApiResponse.success(null, "Vault restored successfully"));
  }
}
