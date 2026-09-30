package com.lifeos.job_tracker.scheduler;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.job_tracker.domains.entity.Interview;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.repository.InterviewRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs once a day and raises a notification for each interview coming up that still has no outcome
 * recorded.
 *
 * <p><b>Interview dedup:</b> rather than firing for anything from "now" to "48h from now" (which
 * would re-fire the same interview on every tick until it happens), this only matches
 * {@code scheduledAt} in the 24h-48h-out window. Since the scan runs once a day, each interview
 * passes through that window exactly once, so it's a single notification per interview with no
 * extra "already notified" bookkeeping needed.
 */
@Component
@RequiredArgsConstructor
public class JobAttentionScanner {

  private static final long INTERVIEW_WINDOW_START_HOURS = 24;
  private static final long INTERVIEW_WINDOW_END_HOURS = 48;

  private final InterviewRepository interviewRepository;
  private final JobListingRepository jobListingRepository;
  private final NotificationEventPublisher notificationEventPublisher;

  @Scheduled(cron = "${job-tracker.attention.scan.cron:0 0 8 * * *}")
  @Transactional(readOnly = true)
  public void scan() {
    scanUpcomingInterviews();
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
