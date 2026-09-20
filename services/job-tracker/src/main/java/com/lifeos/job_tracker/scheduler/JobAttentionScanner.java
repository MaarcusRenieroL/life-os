package com.lifeos.job_tracker.scheduler;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.job_tracker.domains.entity.Interview;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Referral;
import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import com.lifeos.job_tracker.repository.InterviewRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ReferralRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs once a day and raises two kinds of "you need to act on this" notifications for the job
 * pipeline:
 *
 * <ul>
 *   <li>an interview is coming up and still has no outcome recorded
 *   <li>a referral ask is overdue for its follow-up
 * </ul>
 *
 * <p><b>Interview dedup:</b> rather than firing for anything from "now" to "48h from now" (which
 * would re-fire the same interview on every tick until it happens), this only matches
 * {@code scheduledAt} in the 24h-48h-out window. Since the scan runs once a day, each interview
 * passes through that window exactly once, so it's a single notification per interview with no
 * extra "already notified" bookkeeping needed.
 *
 * <p><b>Referral dedup:</b> a referral stays "due" (its {@code followUpAt} keeps being
 * <code>&lt;= today</code>) for as long as the user leaves it unresolved, which is desirable - it
 * should keep nudging until they act - but re-firing on the same day the user actually followed
 * up (before recording a status change past NOT_CONTACTED) would be noisy, so referrals contacted
 * today are skipped for today's scan.
 */
@Component
@RequiredArgsConstructor
public class JobAttentionScanner {

  private static final long INTERVIEW_WINDOW_START_HOURS = 24;
  private static final long INTERVIEW_WINDOW_END_HOURS = 48;

  private static final Set<ReferralStatus> REFERRAL_TERMINAL_STATUSES =
      EnumSet.of(ReferralStatus.RESPONDED, ReferralStatus.REFERRED, ReferralStatus.DECLINED);

  private final InterviewRepository interviewRepository;
  private final ReferralRepository referralRepository;
  private final JobListingRepository jobListingRepository;
  private final NotificationEventPublisher notificationEventPublisher;

  @Scheduled(cron = "${job-tracker.attention.scan.cron:0 0 8 * * *}")
  @Transactional(readOnly = true)
  public void scan() {
    scanUpcomingInterviews();
    scanDueReferralFollowUps();
  }

  private void scanUpcomingInterviews() {
    Instant now = Instant.now();
    Instant windowStart = now.plusSeconds(INTERVIEW_WINDOW_START_HOURS * 3600);
    Instant windowEnd = now.plusSeconds(INTERVIEW_WINDOW_END_HOURS * 3600);

    for (Interview interview :
        interviewRepository.findByResultAndScheduledAtBetween(
            InterviewResult.PENDING, windowStart, windowEnd)) {
      String companyName = resolveCompanyName(interview.getJobId());
      Map<String, String> metadata =
          Map.of(
              "interviewId", interview.getId().toString(),
              "jobId", interview.getJobId().toString());

      notificationEventPublisher.publish(
          interview.getUserId(),
          NotificationEventType.JOB_INTERVIEW_UPCOMING,
          "Interview tomorrow: " + humanize(interview.getRoundType()) + " at " + companyName,
          "Scheduled for " + interview.getScheduledAt(),
          metadata);
    }
  }

  private void scanDueReferralFollowUps() {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);

    for (Referral referral :
        referralRepository.findByStatusNotInAndFollowUpAtLessThanEqual(
            REFERRAL_TERMINAL_STATUSES, today)) {
      if (today.equals(referral.getContactedAt())) {
        continue;
      }

      String companyName = resolveCompanyName(referral.getJobId());
      Map<String, String> metadata =
          Map.of(
              "referralId", referral.getId().toString(),
              "jobId", referral.getJobId().toString());

      notificationEventPublisher.publish(
          referral.getUserId(),
          NotificationEventType.JOB_REFERRAL_FOLLOWUP_DUE,
          "Follow up with " + referral.getContactName() + " about " + companyName,
          "Follow-up was due " + referral.getFollowUpAt(),
          metadata);
    }
  }

  private String resolveCompanyName(UUID jobId) {
    if (jobId == null) {
      return "the company";
    }
    return jobListingRepository
        .findById(jobId)
        .map(JobListing::getCompany)
        .filter(name -> name != null && !name.isBlank())
        .orElse("the company");
  }

  private static String humanize(Enum<?> value) {
    if (value == null) {
      return "Interview";
    }
    String[] words = value.name().split("_");
    StringBuilder result = new StringBuilder();
    for (String word : words) {
      if (word.isEmpty()) {
        continue;
      }
      if (!result.isEmpty()) {
        result.append(' ');
      }
      result.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1).toLowerCase());
    }
    return result.toString();
  }
}
