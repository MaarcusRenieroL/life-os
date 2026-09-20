package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.job_tracker.domains.entity.Interview;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Referral;
import com.lifeos.job_tracker.domains.enums.InterviewResult;
import com.lifeos.job_tracker.domains.enums.InterviewRoundType;
import com.lifeos.job_tracker.domains.enums.ReferralStatus;
import com.lifeos.job_tracker.repository.InterviewRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ReferralRepository;
import com.lifeos.job_tracker.service.TodayService;
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
class TodayServiceTest {

  @Mock private InterviewRepository interviewRepository;
  @Mock private ReferralRepository referralRepository;
  @Mock private JobListingRepository jobListingRepository;
  @InjectMocks private TodayService todayService;

  private final UUID userId = UUID.randomUUID();
  private final UUID jobId = UUID.randomUUID();

  @Test
  void returnsInterviewUpcomingItemForAPendingInterviewInTheLookahead() {
    Interview interview =
        Interview.builder()
            .id(UUID.randomUUID())
            .jobId(jobId)
            .userId(userId)
            .roundType(InterviewRoundType.TECHNICAL)
            .scheduledAt(Instant.now().plusSeconds(3600))
            .result(InterviewResult.PENDING)
            .build();

    when(interviewRepository.findByUserIdAndResultAndScheduledAtBetween(
            eq(userId), eq(InterviewResult.PENDING), any(), any()))
        .thenReturn(List.of(interview));
    when(referralRepository.findByUserIdAndStatusNotInAndFollowUpAtLessThanEqual(eq(userId), any(), any()))
        .thenReturn(List.of());
    when(jobListingRepository.findById(jobId))
        .thenReturn(Optional.of(JobListing.builder().id(jobId).company("Initech").build()));

    List<TodayItemResponse> items = todayService.today(userId);

    assertThat(items).hasSize(1);
    TodayItemResponse item = items.get(0);
    assertThat(item.getModule()).isEqualTo("job-tracker");
    assertThat(item.getType()).isEqualTo("interview_upcoming");
    assertThat(item.getTitle()).isEqualTo("Interview: Technical at Initech");
    assertThat(item.getEntityId()).isEqualTo(interview.getId().toString());
  }

  @Test
  void returnsReferralFollowupItemMarkedUrgentWhenOverdue() {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    Referral referral =
        Referral.builder()
            .id(UUID.randomUUID())
            .jobId(jobId)
            .userId(userId)
            .contactName("Sam Lee")
            .status(ReferralStatus.CONTACTED)
            .followUpAt(today.minusDays(3))
            .build();

    when(interviewRepository.findByUserIdAndResultAndScheduledAtBetween(eq(userId), any(), any(), any()))
        .thenReturn(List.of());
    when(referralRepository.findByUserIdAndStatusNotInAndFollowUpAtLessThanEqual(eq(userId), any(), any()))
        .thenReturn(List.of(referral));
    when(jobListingRepository.findById(jobId))
        .thenReturn(Optional.of(JobListing.builder().id(jobId).company("Umbrella LLC").build()));

    List<TodayItemResponse> items = todayService.today(userId);

    assertThat(items).hasSize(1);
    TodayItemResponse item = items.get(0);
    assertThat(item.getType()).isEqualTo("referral_followup");
    assertThat(item.getTitle()).isEqualTo("Follow up with Sam Lee about Umbrella LLC");
    assertThat(item.getPriority()).isEqualTo("urgent");
  }

  @Test
  void excludesReferralAlreadyContactedToday() {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    Referral referral =
        Referral.builder()
            .id(UUID.randomUUID())
            .jobId(jobId)
            .userId(userId)
            .contactName("Sam Lee")
            .status(ReferralStatus.CONTACTED)
            .followUpAt(today)
            .contactedAt(today)
            .build();

    when(interviewRepository.findByUserIdAndResultAndScheduledAtBetween(eq(userId), any(), any(), any()))
        .thenReturn(List.of());
    when(referralRepository.findByUserIdAndStatusNotInAndFollowUpAtLessThanEqual(eq(userId), any(), any()))
        .thenReturn(List.of(referral));

    List<TodayItemResponse> items = todayService.today(userId);

    assertThat(items).isEmpty();
  }
}
