package com.lifeos.batches.service;

import com.lifeos.batches.domains.record.ParsedAlert;
import com.lifeos.batches.domains.record.RawAlertEmail;
import com.lifeos.common.events.BankAlertEventRecord;
import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
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
  private final com.lifeos.batches.config.FinanceTrackerClient financeTrackerClient;

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

        // Wait for the broker's acknowledgement: fire-and-forget counted an alert as processed even
        // when Kafka was unreachable, and it was then lost.
        bankAlertEventKafkaTemplate.send("bank-alert-events", userId.toString(), event).get(10, TimeUnit.SECONDS);
        processed++;
      } catch (Exception e) {
        log.error("Failed to process Gmail alert {}: {}", email.messageId(), e.getMessage(), e);
        // A real bank alert that no parser understood is money missing from the books - hand it to
        // finance so the user sees it. Statements, offers and OTPs are not, so they are skipped.
        if (looksLikeTransaction(email.body())) {
          financeTrackerClient.reportImportFailure(
              userId, email.messageId(), email.fromAddress(), email.subject(), snippet(email.body()), e.getMessage());
        }
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

  private static final java.util.regex.Pattern AMOUNT =
      java.util.regex.Pattern.compile("(?:Rs\\.?|INR|\\u20b9)\\s?[\\d,]+(?:\\.\\d+)?", java.util.regex.Pattern.CASE_INSENSITIVE);
  private static final java.util.regex.Pattern MOVEMENT =
      java.util.regex.Pattern.compile("\\b(debited|credited|spent|withdrawn|received|paid|transaction)\\b", java.util.regex.Pattern.CASE_INSENSITIVE);

  /** An amount and a money-movement word: what separates a transaction alert from a statement or an offer. */
  static boolean looksLikeTransaction(String body) {
    return body != null && AMOUNT.matcher(body).find() && MOVEMENT.matcher(body).find();
  }

  private static String snippet(String body) {
    if (body == null) {
      return null;
    }
    String text = body.replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ").replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    return text.length() > 600 ? text.substring(0, 600) : text;
  }
}
