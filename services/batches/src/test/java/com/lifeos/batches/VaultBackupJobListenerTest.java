package com.lifeos.batches;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.batches.job.VaultBackupJobListener;
import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.job.JobExecution;
import org.springframework.batch.core.job.parameters.JobParameters;
import org.springframework.batch.core.job.parameters.JobParametersBuilder;

@ExtendWith(MockitoExtension.class)
class VaultBackupJobListenerTest {

  @Mock private NotificationEventPublisher notificationEventPublisher;

  @InjectMocks private VaultBackupJobListener vaultBackupJobListener;

  private final UUID userId = UUID.randomUUID();

  @Test
  void afterJobPublishesBackupFailedWhenJobFailed() {
    JobParameters params =
        new JobParametersBuilder().addString("userId", userId.toString()).toJobParameters();

    JobExecution jobExecution = mock(JobExecution.class);
    when(jobExecution.getStatus()).thenReturn(BatchStatus.FAILED);
    when(jobExecution.getJobParameters()).thenReturn(params);
    when(jobExecution.getAllFailureExceptions())
        .thenReturn(List.of(new RuntimeException("vault unreachable")));

    vaultBackupJobListener.afterJob(jobExecution);

    verify(notificationEventPublisher)
        .publish(
            eq(userId),
            eq(NotificationEventType.BACKUP_FAILED),
            anyString(),
            org.mockito.ArgumentMatchers.contains("vault unreachable"));
  }

  @Test
  void afterJobDoesNothingWhenJobCompletedSuccessfully() {
    JobExecution jobExecution = mock(JobExecution.class);
    when(jobExecution.getStatus()).thenReturn(BatchStatus.COMPLETED);

    vaultBackupJobListener.afterJob(jobExecution);

    verify(notificationEventPublisher, never()).publish(any(), any(), anyString(), anyString());
  }
}
