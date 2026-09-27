package com.lifeos.job_tracker.service;

import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import com.lifeos.job_tracker.repository.InterviewRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ReferralRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Backs the internal {@code GET /v1/jobs/internal/today} endpoint that core's cross-module Today
 * aggregation calls. Kept deliberately lean (two bounded queries, no joins beyond a per-item
 * job-listing lookup) since this is a page-load call, not a report.
 */
@Service
@RequiredArgsConstructor
public class TodayService {

  private static final long INTERVIEW_LOOKAHEAD_DAYS = 3;

  private static final Set<ReferralStatus> REFERRAL_TERMINAL_STATUSES =
      EnumSet.of(ReferralStatus.RESPONDED, ReferralStatus.REFERRED, ReferralStatus.DECLINED);

  private final InterviewRepository interviewRepository;
  private final ReferralRepository referralRepository;
  private final JobListingRepository jobListingRepository;

  @Transactional(readOnly = true)
  public List<TodayItemResponse> today(UUID userId) {
    List<TodayItemResponse> items = new ArrayList<>();
    items.addAll(upcomingInterviews(userId));
    items.addAll(dueReferralFollowUps(userId));
    return items;
  }

  private List<TodayItemResponse> upcomingInterviews(UUID userId) {
    Instant now = Instant.now();
    Instant lookahead = now.plusSeconds(INTERVIEW_LOOKAHEAD_DAYS * 24 * 3600);

    return interviewRepository
        .findByUserIdAndResultAndScheduledAtBetween(userId, InterviewResult.PENDING, now, lookahead)
        .stream()
        .map(
            interview ->
                TodayItemResponse.builder()
                    .module("job-tracker")
                    .type("interview_upcoming")
                    .title(
                        "Interview: "
                            + humanize(interview.getRoundType())
                            + " at "
                            + resolveCompanyName(interview.getJobId()))
                    .description(interview.getInterviewerName())
                    .dueAt(interview.getScheduledAt())
                    .entityId(interview.getId().toString())
                    .priority("warning")
                    .build())
        .toList();
  }

  private List<TodayItemResponse> dueReferralFollowUps(UUID userId) {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);

    return referralRepository
        .findByUserIdAndStatusNotInAndFollowUpAtLessThanEqual(userId, REFERRAL_TERMINAL_STATUSES, today)
        .stream()
        .filter(referral -> !today.equals(referral.getContactedAt()))
        .map(
            referral ->
                TodayItemResponse.builder()
                    .module("job-tracker")
                    .type("referral_followup")
                    .title("Follow up with " + referral.getContactName() + " about " + resolveCompanyName(referral.getJobId()))
                    .description(referral.getRelationship())
                    .dueAt(referral.getFollowUpAt().atStartOfDay(ZoneOffset.UTC).toInstant())
                    .entityId(referral.getId().toString())
                    .priority(referral.getFollowUpAt().isBefore(today) ? "urgent" : "warning")
                    .build())
        .toList();
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
