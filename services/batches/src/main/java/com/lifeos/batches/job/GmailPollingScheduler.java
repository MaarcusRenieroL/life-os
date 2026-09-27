package com.lifeos.batches.job;

import com.lifeos.batches.service.GmailSyncService;
import com.lifeos.batches.service.JobEmailSyncService;
import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GmailPollingScheduler {

  private static final Logger log = LoggerFactory.getLogger(GmailPollingScheduler.class);

  private final GmailSyncService gmailSyncService;
  private final JobEmailSyncService jobEmailSyncService;
  private final NotificationEventPublisher notificationEventPublisher;

  @Value("${owner.user-id}")
  private String ownerUserId;

  @Scheduled(cron = "${gmail.poll.cron}")
  public void polling() {
    UUID userId = UUID.fromString(ownerUserId);

    try {
      gmailSyncService.syncRecent();
    } catch (Exception e) {
      log.error("Bank alert Gmail sync failed outright: {}", e.getMessage(), e);
      notificationEventPublisher.publish(
          userId,
          NotificationEventType.GMAIL_SYNC_FAILED,
          "Bank alert email sync failed",
          "The scheduled bank alert Gmail sync failed to run: " + e.getMessage());
    }

    try {
      jobEmailSyncService.syncRecent();
    } catch (Exception e) {
      log.error("Job email Gmail sync failed outright: {}", e.getMessage(), e);
      notificationEventPublisher.publish(
          userId,
          NotificationEventType.GMAIL_SYNC_FAILED,
          "Job email sync failed",
          "The scheduled job-email Gmail sync failed to run: " + e.getMessage());
    }
  }
}
