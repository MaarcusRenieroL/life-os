package com.lifeos.batches.job;

import com.lifeos.batches.service.JobEmailSyncService;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JobEmailPollingScheduler {

  private final JobEmailSyncService jobEmailSyncService;

  @Scheduled(cron = "${job-email.poll.cron}")
  public void polling() throws IOException {
    jobEmailSyncService.syncRecent();
  }
}
