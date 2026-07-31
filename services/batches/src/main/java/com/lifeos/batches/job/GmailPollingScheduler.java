package com.lifeos.batches.job;

import com.lifeos.batches.service.GmailSyncService;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GmailPollingScheduler {

  private final GmailSyncService gmailSyncService;

  @Scheduled(cron = "${gmail.poll.cron}")
  public void polling() throws IOException {
    gmailSyncService.syncRecent();
  }
}
