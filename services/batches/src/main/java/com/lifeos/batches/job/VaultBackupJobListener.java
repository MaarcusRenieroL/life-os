package com.lifeos.batches.job;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.job.JobExecution;
import org.springframework.batch.core.listener.JobExecutionListener;
import org.springframework.stereotype.Component;

/**
 * Notifies the vault owner when the scheduled backup job fails. This is the integration point for
 * job-level failure (auth/connectivity issues talking to vault, DB errors saving the snapshot,
 * etc.) rather than wrapping {@link VaultBackupTasklet} itself - Spring Batch already tracks the
 * outcome of every step in the {@link JobExecution}, so hooking {@code afterJob} here catches a
 * tasklet failure regardless of what throws, without the tasklet needing to know about
 * notifications at all.
 */
@Component
@RequiredArgsConstructor
public class VaultBackupJobListener implements JobExecutionListener {

  private static final Logger log = LoggerFactory.getLogger(VaultBackupJobListener.class);

  private final NotificationEventPublisher notificationEventPublisher;

  @Override
  public void afterJob(@Nullable JobExecution jobExecution) {
    if (jobExecution == null || jobExecution.getStatus() != BatchStatus.FAILED) {
      return;
    }

    String userIdParam = jobExecution.getJobParameters().getString("userId");

    if (userIdParam == null) {
      log.error("Vault backup job failed but no userId job parameter was present to notify.");
      return;
    }

    UUID userId = UUID.fromString(userIdParam);

    String failureMessage =
        jobExecution.getAllFailureExceptions().stream()
            .findFirst()
            .map(Throwable::getMessage)
            .orElse("The vault backup job failed for an unknown reason.");

    notificationEventPublisher.publish(
        userId,
        NotificationEventType.BACKUP_FAILED,
        "Vault backup failed",
        "The scheduled vault backup did not complete successfully: " + failureMessage);
  }
}
