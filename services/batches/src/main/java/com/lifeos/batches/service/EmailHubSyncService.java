package com.lifeos.batches.service;

import com.lifeos.batches.domains.enums.GmailPurpose;
import com.lifeos.batches.domains.record.RawEmail;
import com.lifeos.common.events.EmailHubEventRecord;
import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import java.io.IOException;
import java.util.Arrays;
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
 * Feeds the inbox to the email hub in core. Where {@link JobEmailSyncService} and {@link
 * GmailSyncService} each look for one narrow kind of mail, this pulls every real message and lets
 * core decide what it is - a bill, an appointment, a subscription receipt, or nothing.
 *
 * <p>Noise is cut before anything is classified: Gmail's own promotions, social and forum tabs
 * are excluded in the search itself, and the senders the bank-alert pipeline already owns are
 * skipped so one email is never handled twice. Re-sending is free - core dedupes on the Gmail
 * message id before doing any AI work - so the window is wide enough to survive downtime.
 */
@Service
@RequiredArgsConstructor
public class EmailHubSyncService {

  private static final Logger log = LoggerFactory.getLogger(EmailHubSyncService.class);
  private static final int MAX_BODY_CHARS = 6000;
  /** One poll never sends more than this, so a first run against a huge inbox stays bounded. */
  private static final int MAX_PER_SYNC = 200;

  @Value("${owner.user-id}")
  private String ownerUserId;

  @Value("${gmail.alert-senders}")
  private String bankAlertSenders;

  @Value("${gmail.job-search.senders}")
  private String jobSenders;

  private final GmailMessageService gmailMessageService;
  private final GmailOAuthService gmailOAuthService;
  private final KafkaTemplate<String, EmailHubEventRecord> emailHubEventKafkaTemplate;
  private final NotificationEventPublisher notificationEventPublisher;

  public int syncRecent() throws IOException {
    // Every connected mailbox is part of the inbox; one being down must not hide the other's mail.
    int sent = 0;
    for (GmailPurpose purpose : gmailOAuthService.connectedPurposes()) {
      try {
        sent += process(gmailMessageService.fetchByQuery(searchClause(), "newer_than:3d", purpose));
      } catch (IOException | RuntimeException e) {
        log.error("Inbox sync failed for the {} mailbox: {}", purpose, e.getMessage(), e);
      }
    }
    return sent;
  }

  String searchClause() {
    // Bank alerts and job-board mail each have their own pipeline; the hub guessing at them as well
    // produced duplicate tasks and "ignored" verdicts on real applications.
    String skipBankAlerts =
        Arrays.stream((bankAlertSenders + "," + jobSenders).split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(s -> "-from:" + s)
            .reduce("", (a, b) -> a + " " + b);
    // Updates is deliberately kept: Gmail files receipts, bills, statements and booking
    // confirmations there, which is most of what the hub exists to catch.
    return "in:inbox -category:promotions -category:social -category:forums" + skipBankAlerts;
  }

  private int process(List<RawEmail> emails) {
    UUID userId = UUID.fromString(ownerUserId);
    int sent = 0;

    for (RawEmail email : emails.stream().limit(MAX_PER_SYNC).toList()) {
      try {
        EmailHubEventRecord event =
            new EmailHubEventRecord(
                userId,
                email.messageId(),
                email.threadId(),
                email.fromAddress(),
                email.subject(),
                truncate(email.body()),
                email.receivedAt());
        emailHubEventKafkaTemplate.send("email-hub-events", userId.toString(), event).get(10, TimeUnit.SECONDS);
        sent++;
      } catch (Exception exception) {
        log.error("Failed to publish inbox email {}: {}", email.messageId(), exception.getMessage());
      }
    }

    int attempted = Math.min(emails.size(), MAX_PER_SYNC);
    if (attempted > 0 && sent < attempted / 2.0) {
      notificationEventPublisher.publish(
          userId,
          NotificationEventType.GMAIL_SYNC_FAILED,
          "Inbox sync had widespread failures",
          "Only " + sent + " of " + attempted + " inbox emails were queued in the last sync run.");
    }
    return sent;
  }

  private static String truncate(String body) {
    if (body == null) {
      return "";
    }
    return body.length() > MAX_BODY_CHARS ? body.substring(0, MAX_BODY_CHARS) : body;
  }
}
