package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.job_tracker.domains.entity.EmailEvent;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.EmailEventStatus;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.record.EmailClassification;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.repository.EmailEventRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.service.EmailEventService;
import com.lifeos.job_tracker.service.JobListingService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EmailEventServiceTest {

  @Mock private EmailEventRepository emailEventRepository;
  @Mock private JobListingRepository jobListingRepository;
  @Mock private JobListingService jobListingService;
  @Mock private AiAssistant ai;
  @InjectMocks private EmailEventService service;

  private final UUID userId = UUID.randomUUID();
  private final Instant received = Instant.parse("2026-09-29T10:00:00Z");

  @BeforeEach
  void setUp() {
    when(ai.available()).thenReturn(true);
    when(jobListingRepository.findAllForUser(userId)).thenReturn(List.of());
  }

  private void classifiedAs(String type, String confidence, String company, String title) {
    when(ai.classifyEmail(anyString(), anyString(), anyString()))
        .thenReturn(new EmailClassification(type, confidence, company, title, null));
  }

  private void ingest() {
    service.ingest(userId, "msg-1", "careers@acme.com", "Update on your application", "body", received);
  }

  private EmailEvent savedEvent() {
    ArgumentCaptor<EmailEvent> captor = ArgumentCaptor.forClass(EmailEvent.class);
    verify(emailEventRepository).save(captor.capture());
    return captor.getValue();
  }

  private static JobListing tracked(String company, String title, JobStatus status) {
    return JobListing.builder().id(UUID.randomUUID()).company(company).title(title).status(status).build();
  }

  @Test
  void anApplicationConfirmationForAnUntrackedJobCreatesAnAppliedJob() {
    classifiedAs("APPLICATION_CONFIRMATION", "HIGH", "Acme", "Backend Engineer");
    JobListing created = tracked("Acme", "Backend Engineer", JobStatus.APPLIED);
    when(jobListingService.createFromEmail(any(), any(), any(), any())).thenReturn(created);

    ingest();

    verify(jobListingService).createFromEmail(userId, "Acme", "Backend Engineer", LocalDate.of(2026, 9, 29));
    assertThat(savedEvent().getStatus()).isEqualTo(EmailEventStatus.APPLIED_AUTOMATICALLY);
    assertThat(savedEvent().getMatchedJobId()).isEqualTo(created.getId());
  }

  @Test
  void aConfirmationForAJobAlreadyTrackedMovesItToAppliedInsteadOfDuplicatingIt() {
    JobListing existing = tracked("Acme", "Backend Engineer", JobStatus.INTERESTED);
    when(jobListingRepository.findAllForUser(userId)).thenReturn(List.of(existing));
    classifiedAs("APPLICATION_CONFIRMATION", "HIGH", "Acme Corp", "Backend Engineer");

    ingest();

    verify(jobListingService).updateStatus(userId, existing.getId(), JobStatus.APPLIED);
    verify(jobListingService, never()).createFromEmail(any(), any(), any(), any());
  }

  @Test
  void applyingToASecondRoleAtATrackedCompanyIsANewJob() {
    when(jobListingRepository.findAllForUser(userId))
        .thenReturn(List.of(tracked("Acme", "Data Scientist", JobStatus.APPLIED)));
    classifiedAs("APPLICATION_CONFIRMATION", "HIGH", "Acme", "Backend Engineer");
    when(jobListingService.createFromEmail(any(), any(), any(), any()))
        .thenReturn(tracked("Acme", "Backend Engineer", JobStatus.APPLIED));

    ingest();

    verify(jobListingService).createFromEmail(eq(userId), eq("Acme"), eq("Backend Engineer"), any());
    verify(jobListingService, never()).updateStatus(any(), any(), any());
  }

  @Test
  void aLowConfidenceConfirmationWaitsForReviewRatherThanCreatingAJob() {
    classifiedAs("APPLICATION_CONFIRMATION", "LOW", "Acme", null);

    ingest();

    verify(jobListingService, never()).createFromEmail(any(), any(), any(), any());
    assertThat(savedEvent().getStatus()).isEqualTo(EmailEventStatus.NEEDS_REVIEW);
  }

  @Test
  void aRejectionForAnUntrackedCompanyIsNeverInventedIntoAJob() {
    classifiedAs("REJECTION", "HIGH", "Globex", "Analyst");

    ingest();

    verify(jobListingService, never()).createFromEmail(any(), any(), any(), any());
    assertThat(savedEvent().getStatus()).isEqualTo(EmailEventStatus.NEEDS_REVIEW);
  }

  @Test
  void anInterviewInviteWithNoRoleStillMatchesTheCompanysJob() {
    JobListing existing = tracked("Acme", "Backend Engineer", JobStatus.APPLIED);
    when(jobListingRepository.findAllForUser(userId)).thenReturn(List.of(existing));
    classifiedAs("INTERVIEW_INVITE", "HIGH", "Acme", null);

    ingest();

    verify(jobListingService).updateStatus(userId, existing.getId(), JobStatus.INTERVIEWING);
  }

  @Test
  void aMessageSeenBeforeIsIgnored() {
    when(emailEventRepository.existsByUserIdAndGmailMessageId(userId, "msg-1")).thenReturn(true);

    ingest();

    verify(ai, never()).classifyEmail(any(), any(), any());
  }
}
