package com.lifeos.batches.job;

import com.lifeos.batches.config.VaultBackupClient;
import com.lifeos.batches.domains.entity.VaultBackup;
import com.lifeos.batches.repository.VaultBackupRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.batch.core.job.parameters.JobParameters;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.StepContribution;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.infrastructure.repeat.RepeatStatus;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class VaultBackupTasklet implements Tasklet {

  private final VaultBackupClient vaultBackupClient;
  private final VaultBackupRepository vaultBackupRepository;

  @Override
  public @Nullable RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext)
      throws Exception {
    JobParameters params = chunkContext.getStepContext().getStepExecution().getJobParameters();

    UUID userId = UUID.fromString(params.getString("userId"));

    String snapshot = vaultBackupClient.fetchSnapshot(userId);

    vaultBackupRepository.save(VaultBackup.builder().userId(userId).snapshot(snapshot).build());

    return RepeatStatus.FINISHED;
  }
}
