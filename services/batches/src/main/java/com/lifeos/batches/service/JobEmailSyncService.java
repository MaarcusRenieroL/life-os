package com.lifeos.batches.service;

import com.lifeos.batches.config.JobTrackerClient;
import com.lifeos.batches.domains.record.RawEmail;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Pulls job-search-shaped emails (interview invites, application confirmations, rejections,
 * offers, or mail from a known job board/ATS) out of the same connected Gmail account the bank-
 * alert sync uses, and forwards each one to job-tracker's classifier. job-tracker decides what
 * happens next (new application, status change, follow-up task, ...) - this service's only job is
 * "find the candidate emails and hand them over", same division of labor as GmailSyncService.
 */
@Service
@RequiredArgsConstructor
public class JobEmailSyncService {

  private static final Logger log = LoggerFactory.getLogger(JobEmailSyncService.class);

  // Broad on purpose: missing a real recruiter email costs more than an
  // occasional false positive, since job-tracker's own classifier (Claude, or
  // a keyword heuristic when Claude is off) makes the real OTHER-vs-not call
  // and just logs anything irrelevant with no side effects.
  @Value("${job-email.keywords}")
  private String keywordsConfig;

  @Value("${job-email.senders}")
  private String sendersConfig;

  @Value("${owner.user-id}")
  private String ownerUserId;

  private final GmailMessageService gmailMessageService;
  private final JobTrackerClient jobTrackerClient;

  public int syncRecent() throws IOException {
    return process(gmailMessageService.fetchByQuery(buildQuery(), "newer_than:2d"));
  }

  // Manual full-history backfill, same rationale as GmailSyncService.syncAll -
  // the scheduled poll only looks back 2 days.
  public int syncAll() throws IOException {
    return process(gmailMessageService.fetchByQuery(buildQuery(), null));
  }

  private String buildQuery() {
    List<String> keywords = List.of(keywordsConfig.split(","));
    String subjectClause = "subject:(" + String.join(" OR ", keywords.stream().map(k -> "\"" + k.trim() + "\"").toList()) + ")";

    List<String> senders = List.of(sendersConfig.split(","));
    String senderClause = "from:(" + String.join(" OR ", senders) + ")";

    return "(" + subjectClause + " OR " + senderClause + ")";
  }

  private int process(List<RawEmail> emails) {
    UUID userId = UUID.fromString(ownerUserId);
    int processed = 0;

    for (RawEmail email : emails) {
      try {
        jobTrackerClient.ingestEmail(userId, email);
        processed++;
      } catch (Exception e) {
        log.error("Failed to forward Gmail message {} to job-tracker: {}", email.messageId(), e.getMessage(), e);
      }
    }

    return processed;
  }
}
