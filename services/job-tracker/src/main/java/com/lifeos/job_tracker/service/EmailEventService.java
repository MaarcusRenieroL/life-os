package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.ReviewEmailEventRequest;
import com.lifeos.job_tracker.domains.entity.EmailEvent;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.Confidence;
import com.lifeos.job_tracker.domains.enums.EmailEventStatus;
import com.lifeos.job_tracker.domains.enums.EmailEventType;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.record.EmailClassification;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.repository.EmailEventRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Turns a Gmail message batches forwarded into either a new job listing (a job-alert digest) or a
 * suggested status change on an existing one (application/interview/rejection/offer signals).
 *
 * <p>A wrong auto-applied status silently corrupts the candidate's pipeline, so status changes
 * only auto-apply when Claude reports HIGH confidence AND the email matched exactly one existing
 * job by company - everything else (ambiguous match, no match, low/medium confidence, or any
 * OFFER, since accept/reject is never inferable from the email itself) is left for the candidate
 * to confirm in the review queue instead of guessing.
 */
@Service
@RequiredArgsConstructor
public class EmailEventService {

  private static final Logger log = LoggerFactory.getLogger(EmailEventService.class);
  private static final int SNIPPET_LENGTH = 240;

  private final EmailEventRepository emailEventRepository;
  private final JobListingRepository jobListingRepository;
  private final JobListingService jobListingService;
  private final AiAssistant ai;

  // Deliberately not @Transactional: createFromLink/updateStatus below are each transactional on
  // their own, and one digest posting failing (a dead link, a 404) must not roll back the sibling
  // postings that succeeded, or the final event row that records what happened.
  public void ingest(UUID userId, String gmailMessageId, String fromAddress, String subject, String body) {
    if (emailEventRepository.existsByUserIdAndGmailMessageId(userId, gmailMessageId)) {
      return;
    }
    if (!ai.available()) {
      log.warn("Skipping email event {}: no AI provider configured", gmailMessageId);
      return;
    }

    EmailClassification classification;
    try {
      classification = ai.classifyEmail(fromAddress, subject, body);
    } catch (RuntimeException exception) {
      log.warn("Could not classify email {}: {}", gmailMessageId, exception.getMessage());
      return;
    }

    EmailEventType type = parseType(classification.type());
    Confidence confidence = parseConfidence(classification.confidence());
    String snippet = snippet(body);

    if (type == EmailEventType.UNRELATED) {
      save(userId, gmailMessageId, fromAddress, subject, snippet, type, confidence, null, null, 0, EmailEventStatus.IGNORED);
      return;
    }

    if (type == EmailEventType.JOB_ALERT_DIGEST) {
      int created = createDigestJobs(userId, classification.postings());
      save(
          userId, gmailMessageId, fromAddress, subject, snippet, type, confidence, null, null, created,
          created > 0 ? EmailEventStatus.APPLIED_AUTOMATICALLY : EmailEventStatus.IGNORED);
      return;
    }

    JobListing matched = matchJob(userId, classification.company(), classification.title());
    JobStatus suggested = suggestedStatusFor(type);
    boolean autoApply = type != EmailEventType.OFFER && matched != null && confidence == Confidence.HIGH;

    if (autoApply) {
      jobListingService.updateStatus(userId, matched.getId(), suggested);
    }

    save(
        userId, gmailMessageId, fromAddress, subject, snippet, type, confidence,
        matched == null ? null : matched.getId(), suggested, 0,
        autoApply ? EmailEventStatus.APPLIED_AUTOMATICALLY : EmailEventStatus.NEEDS_REVIEW);
  }

  @Transactional(readOnly = true)
  public List<EmailEvent> needsReview(UUID userId) {
    return emailEventRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, EmailEventStatus.NEEDS_REVIEW);
  }

  @Transactional
  public EmailEvent review(UUID userId, UUID eventId, ReviewEmailEventRequest request) {
    EmailEvent event =
        emailEventRepository
            .findByIdAndUserId(eventId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Email event", eventId));

    if (request.action() == ReviewEmailEventRequest.EmailEventAction.DISMISS) {
      event.setStatus(EmailEventStatus.DISMISSED);
      return emailEventRepository.save(event);
    }

    UUID jobId = request.jobId() != null ? request.jobId() : event.getMatchedJobId();
    if (jobId == null) {
      throw new InvalidRequestException("Select which job this email is about");
    }
    JobStatus status = request.status() != null ? request.status() : event.getSuggestedStatus();
    if (status == null) {
      throw new InvalidRequestException("Choose a status to apply");
    }

    jobListingService.updateStatus(userId, jobId, status);
    event.setMatchedJobId(jobId);
    event.setSuggestedStatus(status);
    event.setStatus(EmailEventStatus.APPLIED_AUTOMATICALLY);
    return emailEventRepository.save(event);
  }

  private int createDigestJobs(UUID userId, List<EmailClassification.DigestPosting> postings) {
    if (postings == null) return 0;

    int created = 0;
    for (EmailClassification.DigestPosting posting : postings) {
      if (posting.url() == null || posting.url().isBlank()) continue;
      try {
        jobListingService.createFromLink(userId, posting.url(), null);
        created++;
      } catch (RuntimeException exception) {
        log.warn("Could not create job from digest posting {}: {}", posting.url(), exception.getMessage());
      }
    }
    return created;
  }

  /** Matches by company first (exact or substring, case-insensitive) - if more than one job at
   * that company, the one whose title shares the most words with Claude's guess wins. */
  private JobListing matchJob(UUID userId, String company, String title) {
    if (company == null || company.isBlank()) return null;

    List<JobListing> candidates =
        jobListingRepository.findAllForUser(userId).stream()
            .filter(job -> companiesMatch(job.getCompany(), company))
            .toList();

    if (candidates.isEmpty()) return null;
    if (candidates.size() == 1) return candidates.get(0);

    return candidates.stream()
        .max(Comparator.comparingInt(job -> titleOverlap(job.getTitle(), title)))
        .orElse(null);
  }

  private static JobStatus suggestedStatusFor(EmailEventType type) {
    return switch (type) {
      case APPLICATION_CONFIRMATION -> JobStatus.APPLIED;
      case INTERVIEW_INVITE -> JobStatus.INTERVIEWING;
      case REJECTION -> JobStatus.REJECTED;
      case OFFER -> null; // accept/reject is the candidate's call, never inferred
      default -> null;
    };
  }

  private static boolean companiesMatch(String a, String b) {
    if (a == null || b == null) return false;
    String normalizedA = normalize(a);
    String normalizedB = normalize(b);
    if (normalizedA.isEmpty() || normalizedB.isEmpty()) return false;
    return normalizedA.equals(normalizedB) || normalizedA.contains(normalizedB) || normalizedB.contains(normalizedA);
  }

  private static String normalize(String value) {
    return value.toLowerCase().replaceAll("[^a-z0-9]", "");
  }

  private static int titleOverlap(String a, String b) {
    if (a == null || b == null) return 0;
    Set<String> wordsA = new HashSet<>(List.of(a.toLowerCase().split("\\W+")));
    Set<String> wordsB = new HashSet<>(List.of(b.toLowerCase().split("\\W+")));
    wordsA.retainAll(wordsB);
    return wordsA.size();
  }

  private static EmailEventType parseType(String raw) {
    try {
      return EmailEventType.valueOf(raw);
    } catch (Exception exception) {
      return EmailEventType.UNRELATED;
    }
  }

  private static Confidence parseConfidence(String raw) {
    try {
      return Confidence.valueOf(raw);
    } catch (Exception exception) {
      return Confidence.LOW;
    }
  }

  private static String snippet(String body) {
    if (body == null) return null;
    String trimmed = body.strip();
    return trimmed.length() <= SNIPPET_LENGTH ? trimmed : trimmed.substring(0, SNIPPET_LENGTH) + "…";
  }

  private void save(
      UUID userId, String gmailMessageId, String fromAddress, String subject, String snippet,
      EmailEventType type, Confidence confidence, UUID matchedJobId, JobStatus suggestedStatus,
      int createdJobsCount, EmailEventStatus status) {
    emailEventRepository.save(
        EmailEvent.builder()
            .userId(userId)
            .gmailMessageId(gmailMessageId)
            .fromAddress(fromAddress)
            .subject(subject)
            .snippet(snippet)
            .detectedType(type)
            .confidence(confidence)
            .matchedJobId(matchedJobId)
            .suggestedStatus(suggestedStatus)
            .createdJobsCount(createdJobsCount)
            .status(status)
            .build());
  }
}
