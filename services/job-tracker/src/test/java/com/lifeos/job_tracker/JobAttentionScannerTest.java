package com.lifeos.job_tracker;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.job_tracker.domains.entity.Interview;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.InterviewRoundType;
import com.lifeos.job_tracker.repository.InterviewRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.scheduler.JobAttentionScanner;
import java.time.Instant;
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
