package com.lifeos.batches.service;

import com.lifeos.batches.config.JobTrackerClient;
import com.lifeos.batches.domains.record.RawEmail;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Forwards Gmail messages that look job-related (known job-board/ATS senders, or common
 * application-status subject phrasing) to job-tracker, which does the actual Claude
 * classification and decides what to do with each one. This service is a dumb pipe, same as
 * {@link GmailSyncService} is for bank alerts - it doesn't try to understand the email itself,
 * since job-status emails come from arbitrary company domains with no fixed format.
 */
@Service
@RequiredArgsConstructor
public class JobEmailSyncService {

  private static final Logger log = LoggerFactory.getLogger(JobEmailSyncService.class);

  @Value("${owner.user-id}")
  private String ownerUserId;

  @Value("${gmail.job-search.senders}")
  private String sendersConfig;

  @Value("${gmail.job-search.subject-keywords}")
  private String subjectKeywordsConfig;

  private final GmailMessageService gmailMessageService;
  private final JobTrackerClient jobTrackerClient;

  public int syncRecent() throws IOException {
    return processEmails(gmailMessageService.fetchByQuery(searchClause(), "newer_than:2d"));
  }

  public int syncAll() throws IOException {
    return processEmails(gmailMessageService.fetchByQuery(searchClause(), null));
  }

  private String searchClause() {
    List<String> senders = Arrays.stream(sendersConfig.split(",")).map(String::trim).toList();
    List<String> keywords = Arrays.stream(subjectKeywordsConfig.split(",")).map(String::trim).toList();

    String senderClause = senders.stream().map(s -> "from:" + s).collect(Collectors.joining(" OR "));
    String keywordClause =
        keywords.stream().map(k -> "subject:\"" + k + "\"").collect(Collectors.joining(" OR "));

    return "(" + senderClause + " OR " + keywordClause + ")";
  }

  private int processEmails(List<RawEmail> emails) {
    int processed = 0;
    UUID userId = UUID.fromString(ownerUserId);

    for (RawEmail email : emails) {
      try {
        jobTrackerClient.createEmailEvent(email, userId);
        processed++;
      } catch (Exception e) {
        log.error("Failed to forward job email {}: {}", email.messageId(), e.getMessage(), e);
      }
    }

    return processed;
  }
}
