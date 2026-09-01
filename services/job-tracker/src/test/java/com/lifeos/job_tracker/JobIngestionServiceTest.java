package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.job_tracker.domains.dto.request.ScrapedJob;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.service.JobIngestionService;
import com.lifeos.job_tracker.service.JobMatchingService;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobIngestionServiceTest {

  @Mock private JobListingRepository jobListingRepository;
  @Mock private CompanyRepository companyRepository;
  @Mock private AiAssistant ai;
  @Mock private JobMatchingService jobMatchingService;
  @Mock private JobEventProducer eventProducer;
  @InjectMocks private JobIngestionService jobIngestionService;

  private final UUID userId = UUID.randomUUID();

  @Test
  void ingestsANewJobAndSkipsAKnownUrl() {
    ScrapedJob fresh = job("https://x/1", "Backend Engineer", "Acme");
    ScrapedJob dupe = job("https://x/2", "Frontend Engineer", "Acme");

    when(jobListingRepository.findByUserIdAndUrl(userId, "https://x/1")).thenReturn(Optional.empty());
    when(jobListingRepository.findByUserIdAndUrl(userId, "https://x/2"))
        .thenReturn(Optional.of(new JobListing()));
    when(companyRepository.findByUserIdAndNameIgnoreCase(eq(userId), any()))
        .thenReturn(Optional.of(Company.builder().id(UUID.randomUUID()).build()));
    when(jobListingRepository.save(any(JobListing.class)))
        .thenAnswer(
            invocation -> {
              JobListing saved = invocation.getArgument(0);
              if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
              }
              return saved;
            });
    when(ai.available()).thenReturn(false);
    when(jobMatchingService.score(eq(userId), any()))
        .thenReturn(new JobFitResult(80, Map.of()));

    Map<String, Object> result = jobIngestionService.ingest(userId, List.of(fresh, dupe));

    assertThat(result.get("created")).isEqualTo(1);
    assertThat(result.get("duplicates")).isEqualTo(1);
    verify(eventProducer).emit(any(), eq(userId), any());
  }

  @Test
  void skipsRowsWithoutTitleOrCompany() {
    Map<String, Object> result =
        jobIngestionService.ingest(userId, List.of(job("https://x/9", null, "Acme")));

    assertThat(result.get("skipped")).isEqualTo(1);
    assertThat(result.get("created")).isEqualTo(0);
    verify(jobListingRepository, never()).save(any());
  }

  private static ScrapedJob job(String url, String title, String company) {
    return new ScrapedJob(
        null, title, company, "Remote", "REMOTE", url, "desc", "board", null, null, null, null, null,
        null, List.of(), null);
  }
}
