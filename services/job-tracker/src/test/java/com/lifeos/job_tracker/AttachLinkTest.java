package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Covers attaching a posting link to a job that an email created with only a company and title. */
@ExtendWith(MockitoExtension.class)
class AttachLinkTest {

  @Mock private JobListingRepository jobListingRepository;
  @Mock private CompanyRepository companyRepository;
  @Mock private AiAssistant ai;
  @Mock private JobMatchingService jobMatchingService;
  @Mock private JobLinkFetcher jobLinkFetcher;
  @Mock private CareerProfileService careerProfileService;
  @Mock private PdfTextExtractor pdfTextExtractor;
  @Mock private SkillService skillService;
  @Mock private JobStatusHistoryRepository jobStatusHistoryRepository;
  @InjectMocks private JobListingService service;

  private final UUID userId = UUID.randomUUID();
  private final UUID jobId = UUID.randomUUID();
  private JobListing job;

  @BeforeEach
  void setUp() {
    job =
        JobListing.builder()
            .id(jobId)
            .userId(userId)
            .company("Meetswap")
            .title("Back End Developer")
            .source("email")
            .status(JobStatus.APPLIED)
            .appliedAt(LocalDate.of(2026, 9, 30))
            .build();
    lenient().when(jobListingRepository.findByIdAndUserId(jobId, userId)).thenReturn(Optional.of(job));
    lenient().when(jobListingRepository.save(any())).thenAnswer(call -> call.getArgument(0));
  }

  private ParsedJobPosting posting() {
    return new ParsedJobPosting(
        "Senior Back End Developer", "Meetswap", "Remote, India", "REMOTE", "SENIOR", "Social",
        new BigDecimal("2000000"), new BigDecimal("3000000"), "INR", List.of("Java", "Spring"), List.of("Kafka"), List.of(),
        "Build the matching engine.");
  }

  @Test
  void fillsInTheDetailsAndRescoresWithoutTouchingWhatYouAlreadyKnow() {
    when(jobListingRepository.findByUserIdAndUrl(userId, "https://www.linkedin.com/jobs/view/123456/")).thenReturn(Optional.empty());
    when(jobLinkFetcher.fetch("https://www.linkedin.com/jobs/view/123456/"))
        .thenReturn(new JobLinkFetcher.FetchedPage("https://www.linkedin.com/jobs/view/123456/", "page"));
    when(ai.available()).thenReturn(true);
    when(ai.parseJobPosting("page")).thenReturn(posting());
    when(jobMatchingService.score(userId, job)).thenReturn(new JobFitResult(82, null));

    JobListing result =
        service.attachLink(userId, jobId, "https://www.linkedin.com/jobs/view/123456/?trackingId=abc&refId=x", null);

    assertThat(result.getUrl()).isEqualTo("https://www.linkedin.com/jobs/view/123456/");
    assertThat(result.getJobDescriptionText()).isEqualTo("Build the matching engine.");
    assertThat(result.getRequiredSkills()).containsExactly("Java", "Spring");
    assertThat(result.getLocation()).isEqualTo("Remote, India");
    assertThat(result.getFitScore()).isEqualTo(82);
    // Already known - kept as is.
    assertThat(result.getTitle()).isEqualTo("Back End Developer");
    assertThat(result.getStatus()).isEqualTo(JobStatus.APPLIED);
    assertThat(result.getAppliedAt()).isEqualTo(LocalDate.of(2026, 9, 30));
    assertThat(result.getSource()).isEqualTo("email");
  }

  @Test
  void aPlaceholderTitleIsReplacedByTheRealOne() {
    job.setTitle("Untitled role");
    when(ai.available()).thenReturn(true);
    when(jobLinkFetcher.fetch(any())).thenReturn(new JobLinkFetcher.FetchedPage("u", "page"));
    when(ai.parseJobPosting("page")).thenReturn(posting());
    when(jobMatchingService.score(userId, job)).thenReturn(new JobFitResult(70, null));

    assertThat(service.attachLink(userId, jobId, "https://example.com/job/1", null).getTitle()).isEqualTo("Senior Back End Developer");
  }

  @Test
  void pastedTextWorksWhenTheSiteBlocksTheRead() {
    when(ai.available()).thenReturn(true);
    when(ai.parseJobPosting("--- PAGE TEXT ---\nWe are hiring")).thenReturn(posting());
    when(jobMatchingService.score(userId, job)).thenReturn(new JobFitResult(60, null));

    JobListing result = service.attachLink(userId, jobId, null, "We are hiring");

    assertThat(result.getJobDescriptionText()).isEqualTo("Build the matching engine.");
    assertThat(result.getUrl()).isNull();
  }

  @Test
  void aLinkAlreadyOnAnotherJobIsRejected() {
    JobListing other = JobListing.builder().id(UUID.randomUUID()).userId(userId).title("Other role").company("Acme").build();
    when(jobListingRepository.findByUserIdAndUrl(userId, "https://www.linkedin.com/jobs/view/777/")).thenReturn(Optional.of(other));

    assertThatThrownBy(() -> service.attachLink(userId, jobId, "https://www.linkedin.com/jobs/view/777/", null))
        .isInstanceOf(InvalidRequestException.class)
        .hasMessageContaining("already on another job");
  }

  @Test
  void linkedInUrlsAreNormalisedSoTheSamePostingMatches() {
    String expected = "https://www.linkedin.com/jobs/view/4012345678/";
    assertThat(JobListingService.canonicalUrl("https://www.linkedin.com/jobs/view/4012345678/?trackingId=x&refId=y")).isEqualTo(expected);
    assertThat(JobListingService.canonicalUrl("https://in.linkedin.com/jobs/view/back-end-developer-at-meetswap-4012345678?position=1")).isEqualTo(expected);
    assertThat(JobListingService.canonicalUrl("https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4012345678")).isEqualTo(expected);
    assertThat(JobListingService.canonicalUrl("  https://boards.greenhouse.io/acme/jobs/1  ")).isEqualTo("https://boards.greenhouse.io/acme/jobs/1");
    assertThat(JobListingService.canonicalUrl("   ")).isNull();
    assertThat(JobListingService.canonicalUrl(null)).isNull();
  }
}
