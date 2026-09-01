package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.Contact;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.OutreachAttempt;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.OutreachChannel;
import com.lifeos.job_tracker.domains.enums.OutreachStatus;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.ResendEmailClient;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.ContactRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.OutreachAttemptRepository;
import com.lifeos.job_tracker.repository.SkillRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Multi-channel outreach: online form, cold email, LinkedIn message, warm referral. Cold emails are
 * staggered and sent by {@link #executeScheduled()}; the other channels are drafted for the user to
 * send and tracked here.
 */
@Service
@RequiredArgsConstructor
public class OutreachService {

  private static final Logger log = LoggerFactory.getLogger(OutreachService.class);
  private static final Pattern EMAIL =
      Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
  private static final int STAGGER_MINUTES = 45;

  private final OutreachAttemptRepository outreachRepository;
  private final ApplicationRepository applicationRepository;
  private final JobListingRepository jobListingRepository;
  private final ContactRepository contactRepository;
  private final SkillRepository skillRepository;
  private final AiAssistant ai;
  private final ResendEmailClient resend;

  @Transactional(readOnly = true)
  public List<OutreachAttempt> list(UUID userId, UUID applicationId) {
    requireApplication(userId, applicationId);
    return outreachRepository.findAllByApplicationIdOrderByCreatedAtAsc(applicationId);
  }

  @Transactional
  public List<OutreachAttempt> planOutreach(UUID userId, UUID applicationId) {
    Application application = requireApplication(userId, applicationId);
    JobListing job =
        jobListingRepository
            .findByIdAndUserId(application.getJobListingId(), userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", application.getJobListingId()));

    List<String> matching = matchingSkills(userId, job);
    List<OutreachAttempt> attempts = new ArrayList<>();
    Instant slot = Instant.now();

    // 1. Online form
    attempts.add(
        save(
            base(userId, applicationId, OutreachChannel.ONLINE_FORM)
                .recipient(job.getUrl())
                .status(job.getUrl() == null ? OutreachStatus.SKIPPED : OutreachStatus.SENT)
                .sentAt(job.getUrl() == null ? null : Instant.now())
                .build()));

    // 2. Cold email
    String recruiterEmail = discoverRecruiterEmail(job);
    if (recruiterEmail != null && ai.available()) {
      slot = slot.plus(STAGGER_MINUTES, ChronoUnit.MINUTES);
      String body =
          ai.generateColdEmail(null, job.getTitle(), job.getCompany(), matching, jobHighlight(job));
      attempts.add(
          save(
              base(userId, applicationId, OutreachChannel.COLD_EMAIL)
                  .recipient(recruiterEmail)
                  .subject("Application: " + job.getTitle() + " at " + job.getCompany())
                  .messageBody(body)
                  .status(OutreachStatus.SCHEDULED)
                  .scheduledFor(slot)
                  .build()));
    } else {
      attempts.add(
          save(
              base(userId, applicationId, OutreachChannel.COLD_EMAIL)
                  .recipient(recruiterEmail)
                  .status(OutreachStatus.SKIPPED)
                  .error(recruiterEmail == null ? "No recruiter email found" : "Claude unavailable")
                  .build()));
    }

    // 3. LinkedIn message (drafted, user sends)
    if (ai.available()) {
      attempts.add(
          save(
              base(userId, applicationId, OutreachChannel.LINKEDIN)
                  .messageBody(ai.generateLinkedInMessage(null, job.getTitle(), job.getCompany(), matching))
                  .status(OutreachStatus.PENDING)
                  .build()));
    }

    // 4. Warm referral
    List<Contact> contacts =
        job.getCompanyId() == null
            ? List.of()
            : contactRepository.findAllByUserIdAndCompanyIdOrderByNameAsc(userId, job.getCompanyId());
    if (!contacts.isEmpty()) {
      Contact contact = contacts.get(0);
      String body =
          ai.available()
              ? ai.generateReferralMessage(contact.getName(), job.getTitle(), job.getCompany(), matching)
              : null;
      attempts.add(
          save(
              base(userId, applicationId, OutreachChannel.REFERRAL)
                  .recipient(contact.getName())
                  .messageBody(body)
                  .status(OutreachStatus.PENDING)
                  .build()));
    }

    return attempts;
  }

  @Transactional
  public OutreachAttempt markResponse(
      UUID userId, UUID attemptId, Boolean opened, Boolean clicked, Boolean replied) {
    OutreachAttempt attempt =
        outreachRepository
            .findById(attemptId)
            .filter(a -> a.getUserId().equals(userId))
            .orElseThrow(() -> ResourceNotFoundException.of("Outreach attempt", attemptId));
    if (opened != null) {
      attempt.setOpened(opened);
    }
    if (clicked != null) {
      attempt.setClicked(clicked);
    }
    if (Boolean.TRUE.equals(replied)) {
      attempt.setReplied(true);
      attempt.setResponseDate(Instant.now());
    }
    return outreachRepository.save(attempt);
  }

  @Scheduled(fixedDelayString = "${job-tracker.outreach.sweep-ms:300000}")
  @Transactional
  public void executeScheduled() {
    List<OutreachAttempt> due =
        outreachRepository.findAllByStatusAndScheduledForBefore(OutreachStatus.SCHEDULED, Instant.now());
    for (OutreachAttempt attempt : due) {
      if (attempt.getChannel() != OutreachChannel.COLD_EMAIL || attempt.getRecipient() == null) {
        continue;
      }
      try {
        resend.send(attempt.getRecipient(), attempt.getSubject(), attempt.getMessageBody());
        attempt.setStatus(OutreachStatus.SENT);
        attempt.setSentAt(Instant.now());
      } catch (RuntimeException exception) {
        attempt.setStatus(OutreachStatus.FAILED);
        attempt.setError(exception.getMessage());
      }
      outreachRepository.save(attempt);
    }
    if (!due.isEmpty()) {
      log.info("processed {} scheduled outreach emails", due.size());
    }
  }

  String discoverRecruiterEmail(JobListing job) {
    if (job.getRecruiterEmail() != null && !job.getRecruiterEmail().isBlank()) {
      return job.getRecruiterEmail();
    }
    if (job.getJobDescriptionText() != null) {
      Matcher matcher = EMAIL.matcher(job.getJobDescriptionText());
      if (matcher.find()) {
        return matcher.group();
      }
    }
    return null;
  }

  private List<String> matchingSkills(UUID userId, JobListing job) {
    if (job.getRequiredSkills() == null || job.getRequiredSkills().isEmpty()) {
      return List.of();
    }
    Set<String> owned =
        skillRepository.findAllByUserIdOrderByNameAsc(userId).stream()
            .map(Skill::getName)
            .map(name -> name.toLowerCase(Locale.ROOT))
            .collect(Collectors.toSet());
    List<String> matched =
        job.getRequiredSkills().stream()
            .filter(skill -> owned.contains(skill.toLowerCase(Locale.ROOT)))
            .limit(3)
            .toList();
    return matched.isEmpty() ? job.getRequiredSkills().stream().limit(3).toList() : matched;
  }

  private static String jobHighlight(JobListing job) {
    if (job.getJobDescriptionText() == null) {
      return null;
    }
    return job.getJobDescriptionText().length() > 240
        ? job.getJobDescriptionText().substring(0, 240)
        : job.getJobDescriptionText();
  }

  private OutreachAttempt.OutreachAttemptBuilder base(
      UUID userId, UUID applicationId, OutreachChannel channel) {
    return OutreachAttempt.builder().userId(userId).applicationId(applicationId).channel(channel);
  }

  private OutreachAttempt save(OutreachAttempt attempt) {
    return outreachRepository.save(attempt);
  }

  private Application requireApplication(UUID userId, UUID applicationId) {
    return applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Application", applicationId));
  }
}
