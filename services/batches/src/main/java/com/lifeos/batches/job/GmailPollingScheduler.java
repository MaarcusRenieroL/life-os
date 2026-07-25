package com.lifeos.batches.job;

import com.lifeos.batches.config.FinanceTrackerClient;
import com.lifeos.batches.domains.record.ParsedAlert;
import com.lifeos.batches.domains.record.RawAlertEmail;
import com.lifeos.batches.service.GmailAlertParsingService;
import com.lifeos.batches.service.GmailMessageService;
import java.io.IOException;
import java.util.List;
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

  @Value("${owner.user-id}")
  private String ownerUserId;

  private final GmailMessageService gmailMessageService;
  private final GmailAlertParsingService gmailAlertParsingService;
  private final FinanceTrackerClient financeTrackerClient;

  @Scheduled(cron = "${gmail.poll.cron}")
  public void polling() throws IOException {
    List<RawAlertEmail> emails = gmailMessageService.fetchRecentAlerts();

    for (RawAlertEmail email : emails) {
      try {
        ParsedAlert alert =
            gmailAlertParsingService.parse(
                email.messageId(),
                email.fromAddress(),
                email.subject(),
                email.body(),
                email.receivedAt());

        financeTrackerClient.createTransaction(alert, UUID.fromString(ownerUserId));
      } catch (Exception e) {
        log.error("Failed to process Gmail alert {}: {}", email.messageId(), e.getMessage(), e);
      }
    }
  }
}
