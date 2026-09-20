package com.lifeos.batches.service;

import com.lifeos.batches.domains.record.ParsedAlert;
import com.lifeos.batches.domains.record.RawAlertEmail;
import com.lifeos.common.events.BankAlertEventRecord;
import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

/**
 * Shared between the scheduled 2-day poll (GmailPollingScheduler) and the manual full-history
 * backfill endpoint (GmailController) - both need the same "fetch alerts, parse each, publish to
 * finance-tracker" pipeline, just with a different email set.
 *
 * <p>Published to Kafka instead of the previous synchronous per-email REST call to
 * finance-tracker, matching {@link JobEmailSyncService}'s pipeline - same N-sequential-calls
 * shape, so the same fix applies even though this path has no AI call blocking it.
 * {@code TransactionService.createFromEmailAlert} already dedupes on {@code sourceReference}, so
 * a redelivered event is a safe no-op.
 */
@Service
@RequiredArgsConstructor
public class GmailSyncService {

  private static final Logger log = LoggerFactory.getLogger(GmailSyncService.class);

  @Value("${owner.user-id}")
  private String ownerUserId;

  private final GmailMessageService gmailMessageService;
  private final GmailAlertParsingService gmailAlertParsingService;
  private final KafkaTemplate<String, BankAlertEventRecord> bankAlertEventKafkaTemplate;
  private final NotificationEventPublisher notificationEventPublisher;

  public int syncRecent() throws IOException {
    return processEmails(gmailMessageService.fetchRecentAlerts());
  }

  public int syncAll() throws IOException {
    return processEmails(gmailMessageService.fetchAllAlerts());
  }

  private int processEmails(List<RawAlertEmail> emails) {
    int processed = 0;
    UUID userId = UUID.fromString(ownerUserId);

    for (RawAlertEmail email : emails) {
      try {
        ParsedAlert alert =
            gmailAlertParsingService.parse(
                email.messageId(),
                email.fromAddress(),
                email.subject(),
                email.body(),
                email.receivedAt());

        BankAlertEventRecord event =
            new BankAlertEventRecord(
                userId,
                alert.bankName(),
                alert.accountType().name(),
                alert.amount(),
                alert.type().name(),
                alert.transactionDate(),
                alert.description(),
                alert.sourceReference());

        bankAlertEventKafkaTemplate.send("bank-alert-events", userId.toString(), event);
        processed++;
      } catch (Exception e) {
        log.error("Failed to process Gmail alert {}: {}", email.messageId(), e.getMessage(), e);
      }
    }

    if (!emails.isEmpty() && processed < emails.size() / 2.0) {
      notificationEventPublisher.publish(
          userId,
          NotificationEventType.GMAIL_SYNC_FAILED,
          "Bank alert email sync had widespread failures",
          "Only "
              + processed
              + " of "
              + emails.size()
              + " bank alert emails were processed successfully in the last sync run.");
    }

    return processed;
  }
}
