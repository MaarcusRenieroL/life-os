package com.lifeos.batches.job;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.parameters.JobParameters;
import org.springframework.batch.core.job.parameters.JobParametersBuilder;
import org.springframework.batch.core.launch.JobOperator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BackupScheduler {

  private final JobOperator jobOperator;
  private final Job vaultBackupJob;

  @Value("${owner.user-id}")
  private String ownerUserId;

  @Scheduled(cron = "${backup.cron}")
  public void runScheduledBackup() throws Exception {
    JobParameters params =
        new JobParametersBuilder()
            .addString("userId", UUID.fromString(ownerUserId).toString())
            .addLong("timestamp", System.currentTimeMillis())
            .toJobParameters();

    jobOperator.start(vaultBackupJob, params);
  }
}
