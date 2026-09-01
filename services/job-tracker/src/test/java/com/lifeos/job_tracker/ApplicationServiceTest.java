package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.job_tracker.config.JobTrackerProperties;
import com.lifeos.job_tracker.domains.dto.request.CreateApplicationRequest;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import com.lifeos.job_tracker.exception.DuplicateResourceException;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.ApplicationStatusHistoryRepository;
import com.lifeos.job_tracker.repository.InterviewRoundRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.OfferRepository;
import com.lifeos.job_tracker.repository.ReferralRepository;
import com.lifeos.job_tracker.repository.ResumeRepository;
import com.lifeos.job_tracker.service.ApplicationService;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

  @Mock private ApplicationRepository applicationRepository;
  @Mock private ApplicationStatusHistoryRepository statusHistoryRepository;
  @Mock private JobListingRepository jobListingRepository;
  @Mock private ResumeRepository resumeRepository;
  @Mock private InterviewRoundRepository interviewRoundRepository;
  @Mock private ReferralRepository referralRepository;
  @Mock private OfferRepository offerRepository;
  @Mock private JobEventProducer eventProducer;

  private ApplicationService applicationService;

  private final UUID userId = UUID.randomUUID();
  private final UUID jobId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    applicationService =
        new ApplicationService(
            applicationRepository,
            statusHistoryRepository,
            jobListingRepository,
            resumeRepository,
            interviewRoundRepository,
            referralRepository,
            offerRepository,
            eventProducer,
            new JobTrackerProperties(new JobTrackerProperties.Storage("/tmp"), new JobTrackerProperties.FollowUp(7)));
  }

  @Test
  void createPersistsAppliedStatusWritesHistoryAndEmitsEvents() {
    JobListing job = new JobListing();
    job.setId(jobId);
    when(jobListingRepository.findByIdAndUserId(jobId, userId)).thenReturn(Optional.of(job));
    when(applicationRepository.existsByUserIdAndJobListingId(userId, jobId)).thenReturn(false);
    when(applicationRepository.save(any(Application.class)))
        .thenAnswer(
            invocation -> {
              Application saved = invocation.getArgument(0);
              if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
              }
              return saved;
            });

    Application created =
        applicationService.create(
            userId, new CreateApplicationRequest(jobId, null, null, null, null, null));

    assertThat(created.getStatus()).isEqualTo(ApplicationStatus.APPLIED);
    assertThat(created.getFollowUpReminderDate()).isNotNull();
    verify(statusHistoryRepository).save(any());
    verify(eventProducer).emit(eq(JobEventTopics.APPLICATION_SUBMITTED), eq(userId), any(Map.class));
  }

  @Test
  void createRejectsDuplicateApplication() {
    JobListing job = new JobListing();
    job.setId(jobId);
    when(jobListingRepository.findByIdAndUserId(jobId, userId)).thenReturn(Optional.of(job));
    when(applicationRepository.existsByUserIdAndJobListingId(userId, jobId)).thenReturn(true);

    assertThatThrownBy(
            () ->
                applicationService.create(
                    userId, new CreateApplicationRequest(jobId, null, null, null, null, null)))
        .isInstanceOf(DuplicateResourceException.class);
  }

  @Test
  void updateStatusRecordsTransition() {
    UUID appId = UUID.randomUUID();
    Application application =
        Application.builder().id(appId).userId(userId).status(ApplicationStatus.APPLIED).build();
    when(applicationRepository.findByIdAndUserId(appId, userId)).thenReturn(Optional.of(application));
    when(applicationRepository.save(any(Application.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    applicationService.updateStatus(userId, appId, "Screening", "call booked");

    assertThat(application.getStatus()).isEqualTo(ApplicationStatus.SCREENING);
    verify(statusHistoryRepository).save(any());
    verify(eventProducer).emit(eq(JobEventTopics.INTERVIEW_SCHEDULED), eq(userId), any(Map.class));
  }
}
