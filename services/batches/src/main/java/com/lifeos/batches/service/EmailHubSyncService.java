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
import java.util.stream.Collectors;
import java.util.stream.Stream;
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

  /** Extra senders or domains the hub may read, on top of the subject keywords. */
  @Value("${gmail.email-hub.senders:}")
  private String allowedSenders = "";

  /** Bills, banks and bookings: a subject must mention one of these (or come from an allowed sender). */
  @Value("${gmail.email-hub.subject-keywords:invoice,bill,receipt,statement,payment,booking,reservation,confirmation,order,due,renewal,subscription,ticket,appointment}")
  private String subjectKeywords = "invoice,bill,receipt,statement,payment,booking,reservation,confirmation,order,due,renewal,subscription,ticket,appointment";

  /** Whole domains that never reach the hub; job boards are added automatically from the job-search senders. */
  @Value("${gmail.email-hub.blocked-domains:successfactors.com,join.com,jobgether.com,sysvine.com,ambitionbox.com}")
  private String blockedDomains = "";

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

  private static List<String> split(String csv) {
    return Arrays.stream(csv.split(",")).map(String::trim).filter(x -> !x.isEmpty()).toList();
  }

  String searchClause() {
    // Bank alerts and job-board mail each have their own pipeline; the hub guessing at them as well
    // produced duplicate tasks and "ignored" verdicts on real applications. Job boards are blocked by
    // domain (linkedin.com, naukri.com, ...) because they send from many addresses.
    List<String> blocked = new java.util.ArrayList<>(split(blockedDomains));
    split(jobSenders).forEach(sender -> blocked.add(sender.substring(sender.indexOf('@') + 1)));
    String skipSenders =
        Stream.concat(split(bankAlertSenders).stream().map(a -> "-from:" + a), blocked.stream().distinct().map(d -> "-from:" + d))
            .collect(Collectors.joining(" "));

    // Security codes are never fetched: excluded here, and SecurityMail re-checks what gets through.
    String skipSecurity =
        SecurityMail.SUBJECT_PHRASES.stream().map(p -> "-subject:\"" + p + "\"").collect(Collectors.joining(" "));

    // Allow-list: only bills, banks and bookings. A subject keyword or a named sender qualifies.
    String keywords = split(subjectKeywords).stream().map(k -> "subject:\"" + k + "\"").collect(Collectors.joining(" OR "));
    String senders = split(allowedSenders).stream().map(a -> "from:" + a).collect(Collectors.joining(" OR "));
    String allow = senders.isEmpty() ? keywords : keywords + " OR " + senders;

    return "in:inbox -category:promotions -category:social -category:forums " + skipSenders + " " + skipSecurity + " (" + allow + ")";
  }

  private int process(List<RawEmail> emails) {
    UUID userId = UUID.fromString(ownerUserId);
    int sent = 0;

    for (RawEmail email : emails.stream().filter(e -> !SecurityMail.matches(e.subject(), e.body())).limit(MAX_PER_SYNC).toList()) {
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

    int attempted = Math.min((int) emails.stream().filter(e -> !SecurityMail.matches(e.subject(), e.body())).count(), MAX_PER_SYNC);
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
