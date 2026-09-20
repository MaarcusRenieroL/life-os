package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.IngestSource;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.JobLinkFetcher;
import com.lifeos.job_tracker.integration.PdfTextExtractor;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.JobStatusHistoryRepository;
import com.lifeos.job_tracker.service.CareerProfileService;
import com.lifeos.job_tracker.service.JobListingService;
import com.lifeos.job_tracker.service.JobMatchingService;
import com.lifeos.job_tracker.service.SkillService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Covers {@link JobListingService#createFromQuickCapture} - the minimal job-listing path core's
 * quick-capture flow hits, distinct from the URL-scraping {@code createFromLink}. */
@ExtendWith(MockitoExtension.class)
class JobListingServiceQuickCaptureTest {

  @Mock private JobListingRepository jobListingRepository;
  @Mock private CompanyRepository companyRepository;
  @Mock private AiAssistant ai;
  @Mock private JobMatchingService jobMatchingService;
  @Mock private JobLinkFetcher jobLinkFetcher;
  @Mock private CareerProfileService careerProfileService;
  @Mock private PdfTextExtractor pdfTextExtractor;
  @Mock private SkillService skillService;
  @Mock private JobStatusHistoryRepository jobStatusHistoryRepository;

  @InjectMocks private JobListingService jobListingService;

  private final UUID userId = UUID.randomUUID();

  @Test
  void reusesExistingCompanyByNameAndSeedsAMinimalInterestedListing() {
    Company existing = Company.builder().id(UUID.randomUUID()).userId(userId).name("Stripe").build();
    when(companyRepository.findByUserIdAndNameIgnoreCase(userId, "Stripe")).thenReturn(Optional.of(existing));
    when(jobListingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    JobListing job = jobListingService.createFromQuickCapture(userId, "Stripe", "Backend Engineer");

    assertThat(job.getCompany()).isEqualTo("Stripe");
    assertThat(job.getCompanyId()).isEqualTo(existing.getId());
    assertThat(job.getTitle()).isEqualTo("Backend Engineer");
    assertThat(job.getUserId()).isEqualTo(userId);
    assertThat(job.getStatus()).isEqualTo(JobStatus.INTERESTED);
    assertThat(job.getSource()).isEqualTo("quick-capture");
    assertThat(job.getIngestedBy()).isEqualTo(IngestSource.MANUAL);
    assertThat(job.getVisaSponsorship()).isEqualTo(VisaSponsorship.UNKNOWN);
    assertThat(job.getParseStatus()).isEqualTo(ProcessingStatus.COMPLETED);
    verify(companyRepository, never()).save(any());
  }

  @Test
  void createsANewCompanyWhenNoneMatchesByName() {
    when(companyRepository.findByUserIdAndNameIgnoreCase(userId, "NewCo")).thenReturn(Optional.empty());
    Company saved = Company.builder().id(UUID.randomUUID()).userId(userId).name("NewCo").build();
    when(companyRepository.save(any())).thenReturn(saved);
    when(jobListingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    JobListing job = jobListingService.createFromQuickCapture(userId, "NewCo", "Product Manager");

    assertThat(job.getCompanyId()).isEqualTo(saved.getId());
    ArgumentCaptor<Company> companyCaptor = ArgumentCaptor.forClass(Company.class);
    verify(companyRepository).save(companyCaptor.capture());
    assertThat(companyCaptor.getValue().getName()).isEqualTo("NewCo");
  }

  @Test
  void recordsAStatusHistoryEntryFromNoStatusToInterested() {
    when(companyRepository.findByUserIdAndNameIgnoreCase(any(), any())).thenReturn(Optional.empty());
    when(companyRepository.save(any()))
        .thenReturn(Company.builder().id(UUID.randomUUID()).userId(userId).name("Acme").build());
    UUID jobId = UUID.randomUUID();
    when(jobListingRepository.save(any()))
        .thenAnswer(
            invocation -> {
              JobListing arg = invocation.getArgument(0);
              arg.setId(jobId);
              return arg;
            });

    jobListingService.createFromQuickCapture(userId, "Acme", "Engineer");

    verify(jobStatusHistoryRepository)
        .save(
            org.mockito.ArgumentMatchers.argThat(
                history ->
                    history.getJobId().equals(jobId)
                        && history.getFromStatus() == null
                        && history.getToStatus() == JobStatus.INTERESTED));
  }

  @Test
  void blankCompanyAndTitleIsRejected() {
    assertThatThrownBy(() -> jobListingService.createFromQuickCapture(userId, "  ", null))
        .isInstanceOf(InvalidRequestException.class);
    verify(jobListingRepository, never()).save(any());
  }

  @Test
  void missingTitleFallsBackToUntitledRole() {
    when(companyRepository.findByUserIdAndNameIgnoreCase(userId, "Acme")).thenReturn(Optional.empty());
    when(companyRepository.save(any()))
        .thenReturn(Company.builder().id(UUID.randomUUID()).userId(userId).name("Acme").build());
    when(jobListingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    JobListing job = jobListingService.createFromQuickCapture(userId, "Acme", null);

    assertThat(job.getTitle()).isEqualTo("Untitled role");
  }
}
