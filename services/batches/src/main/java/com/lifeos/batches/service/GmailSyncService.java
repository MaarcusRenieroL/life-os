package com.lifeos.batches.service;

import com.lifeos.batches.config.FinanceTrackerClient;
import com.lifeos.batches.domains.record.ParsedAlert;
import com.lifeos.batches.domains.record.RawAlertEmail;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// Shared between the scheduled 2-day poll (GmailPollingScheduler) and the
// manual full-history backfill endpoint (GmailController) - both need the
// same "fetch alerts, parse each, forward to finance-tracker" pipeline, just
// with a different email set.
@Service
@RequiredArgsConstructor
public class GmailSyncService {

  private static final Logger log = LoggerFactory.getLogger(GmailSyncService.class);

  @Value("${owner.user-id}")
  private String ownerUserId;

  private final GmailMessageService gmailMessageService;
  private final GmailAlertParsingService gmailAlertParsingService;
  private final FinanceTrackerClient financeTrackerClient;

  public int syncRecent() throws IOException {
    return processEmails(gmailMessageService.fetchRecentAlerts());
  }

  public int syncAll() throws IOException {
    return processEmails(gmailMessageService.fetchAllAlerts());
  }

  private int processEmails(List<RawAlertEmail> emails) {
    int processed = 0;

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
        processed++;
      } catch (Exception e) {
        log.error("Failed to process Gmail alert {}: {}", email.messageId(), e.getMessage(), e);
      }
    }

    return processed;
  }
}
