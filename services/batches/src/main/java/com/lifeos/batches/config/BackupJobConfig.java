package com.lifeos.batches.config;

import com.lifeos.batches.job.VaultBackupTasklet;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.Step;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@RequiredArgsConstructor
public class BackupJobConfig {

  private final JobRepository jobRepository;
  private final PlatformTransactionManager platformTransactionManager;
  private final VaultBackupTasklet vaultBackupTasklet;

  @Bean
  public Step vaultBackupStep() {
    return new StepBuilder("vaultBackupStep", jobRepository)
        .tasklet(vaultBackupTasklet, platformTransactionManager)
        .build();
  }

  @Bean
  public Job vaultBackupJob() {
    return new JobBuilder("vaultBackupJob", jobRepository).start(vaultBackupStep()).build();
  }
}
