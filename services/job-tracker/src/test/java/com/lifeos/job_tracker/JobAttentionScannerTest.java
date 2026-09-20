package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.job_tracker.domains.entity.Interview;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Referral;
import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.InterviewRoundType;
import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import com.lifeos.job_tracker.repository.InterviewRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ReferralRepository;
import com.lifeos.job_tracker.scheduler.JobAttentionScanner;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobAttentionScannerTest {

  @Mock private InterviewRepository interviewRepository;
  @Mock private ReferralRepository referralRepository;
  @Mock private JobListingRepository jobListingRepository;
  @Mock private NotificationEventPublisher notificationEventPublisher;
  @InjectMocks private JobAttentionScanner jobAttentionScanner;

  private final UUID userId = UUID.randomUUID();
  private final UUID jobId = UUID.randomUUID();

  @Test
  void publishesInterviewUpcomingForEachPendingInterviewInTheWindow() {
    Interview interview =
        Interview.builder()
            .id(UUID.randomUUID())
            .jobId(jobId)
            .userId(userId)
            .roundType(InterviewRoundType.SYSTEM_DESIGN)
            .scheduledAt(Instant.now().plusSeconds(30 * 3600))
            .result(InterviewResult.PENDING)
            .build();

    when(interviewRepository.findByResultAndScheduledAtBetween(eq(InterviewResult.PENDING), any(), any()))
        .thenReturn(List.of(interview));
    when(referralRepository.findByStatusNotInAndFollowUpAtLessThanEqual(any(), any()))
        .thenReturn(List.of());
    when(jobListingRepository.findById(jobId))
        .thenReturn(Optional.of(JobListing.builder().id(jobId).company("Acme Corp").build()));

    jobAttentionScanner.scan();

    verify(notificationEventPublisher)
        .publish(
            eq(userId),
            eq(NotificationEventType.JOB_INTERVIEW_UPCOMING),
            eq("Interview tomorrow: System Design at Acme Corp"),
            any(),
            any());
  }

  @Test
  void skipsReferralFollowUpAlreadyContactedToday() {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    Referral referral =
        Referral.builder()
            .id(UUID.randomUUID())
            .jobId(jobId)
            .userId(userId)
            .contactName("Jane Doe")
            .status(ReferralStatus.CONTACTED)
            .followUpAt(today)
            .contactedAt(today)
            .build();

    when(interviewRepository.findByResultAndScheduledAtBetween(any(), any(), any())).thenReturn(List.of());
    when(referralRepository.findByStatusNotInAndFollowUpAtLessThanEqual(any(), any()))
        .thenReturn(List.of(referral));

    jobAttentionScanner.scan();

    verify(notificationEventPublisher, never())
        .publish(any(), eq(NotificationEventType.JOB_REFERRAL_FOLLOWUP_DUE), any(), any(), any());
  }

  @Test
  void publishesReferralFollowUpDueWhenNotContactedToday() {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    Referral referral =
        Referral.builder()
            .id(UUID.randomUUID())
            .jobId(jobId)
            .userId(userId)
            .contactName("Jane Doe")
            .status(ReferralStatus.MESSAGE_DRAFTED)
            .followUpAt(today.minusDays(2))
            .contactedAt(null)
            .build();

    when(interviewRepository.findByResultAndScheduledAtBetween(any(), any(), any())).thenReturn(List.of());
    when(referralRepository.findByStatusNotInAndFollowUpAtLessThanEqual(any(), any()))
        .thenReturn(List.of(referral));
    when(jobListingRepository.findById(jobId))
        .thenReturn(Optional.of(JobListing.builder().id(jobId).company("Globex").build()));

    jobAttentionScanner.scan();

    verify(notificationEventPublisher)
        .publish(
            eq(userId),
            eq(NotificationEventType.JOB_REFERRAL_FOLLOWUP_DUE),
            eq("Follow up with Jane Doe about Globex"),
            any(),
            any());
  }

  @Test
  void interviewWithoutMatchingJobFallsBackToGenericCompanyName() {
    Interview interview =
        Interview.builder()
            .id(UUID.randomUUID())
            .jobId(jobId)
            .userId(userId)
            .roundType(InterviewRoundType.RECRUITER_SCREENING)
            .scheduledAt(Instant.now().plusSeconds(30 * 3600))
            .result(InterviewResult.PENDING)
            .build();

    when(interviewRepository.findByResultAndScheduledAtBetween(any(), any(), any())).thenReturn(List.of(interview));
    when(referralRepository.findByStatusNotInAndFollowUpAtLessThanEqual(any(), any()))
        .thenReturn(List.of());
    when(jobListingRepository.findById(jobId)).thenReturn(Optional.empty());

    jobAttentionScanner.scan();

    verify(notificationEventPublisher)
        .publish(
            eq(userId),
            eq(NotificationEventType.JOB_INTERVIEW_UPCOMING),
            eq("Interview tomorrow: Recruiter Screening at the company"),
            any(),
            any());
  }
}
