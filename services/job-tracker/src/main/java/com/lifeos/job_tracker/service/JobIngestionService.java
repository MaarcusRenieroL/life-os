package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.ScrapedJob;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.IngestSource;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** De-dupes and persists scraped / imported job listings, then scores + announces the new ones. */
@Service
@RequiredArgsConstructor
public class JobIngestionService {

  private static final Logger log = LoggerFactory.getLogger(JobIngestionService.class);

  private final JobListingRepository jobListingRepository;
  private final CompanyRepository companyRepository;
  private final AiAssistant ai;
  private final JobMatchingService jobMatchingService;
  private final JobEventProducer eventProducer;

  @Transactional
  public Map<String, Object> ingest(UUID userId, List<ScrapedJob> jobs) {
    int created = 0;
    int duplicates = 0;
    int skipped = 0;

    for (ScrapedJob scraped : jobs == null ? List.<ScrapedJob>of() : jobs) {
      if (scraped.title() == null || scraped.company() == null) {
        skipped++;
        continue;
      }
      if (isDuplicate(userId, scraped)) {
        duplicates++;
        continue;
      }

      Company company = resolveCompany(userId, scraped.company());
      JobListing job =
          jobListingRepository.save(
              JobListing.builder()
                  .userId(userId)
                  .companyId(company == null ? null : company.getId())
                  .externalId(scraped.externalId())
                  .title(scraped.title())
                  .company(scraped.company())
                  .location(scraped.location())
                  .workModel(parseEnum(WorkModel.class, scraped.workModel()))
                  .url(scraped.url())
                  .jobDescriptionText(scraped.jobDescriptionText())
                  .source(scraped.source() == null ? "scraper" : scraped.source())
                  .salaryMin(scraped.salaryMin())
                  .salaryMax(scraped.salaryMax())
                  .currency(scraped.currency())
                  .postedDate(scraped.postedDate())
                  .seniorityLevel(parseEnum(SeniorityLevel.class, scraped.seniorityLevel()))
                  .industry(scraped.industry())
                  .tags(scraped.tags())
                  .recruiterEmail(scraped.recruiterEmail())
                  .visaSponsorship(VisaSponsorship.UNKNOWN)
                  .parseStatus(ProcessingStatus.PENDING)
                  .ingestedBy(IngestSource.SCRAPER)
                  .scrapedDate(Instant.now())
                  .build());

      scoreQuietly(userId, job);
      jobListingRepository.save(job);

      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("jobId", job.getId().toString());
      payload.put("title", job.getTitle());
      payload.put("company", job.getCompany());
      if (job.getFitScore() != null) {
        payload.put("score", job.getFitScore());
      }
      eventProducer.emit(JobEventTopics.JOB_DISCOVERED, userId, payload);
      created++;
    }

    log.info("ingested jobs for {}: {} created, {} dup, {} skipped", userId, created, duplicates, skipped);
    return Map.of("created", created, "duplicates", duplicates, "skipped", skipped);
  }

  private boolean isDuplicate(UUID userId, ScrapedJob scraped) {
    if (scraped.source() != null
        && scraped.externalId() != null
        && jobListingRepository
            .findByUserIdAndSourceAndExternalId(userId, scraped.source(), scraped.externalId())
            .isPresent()) {
      return true;
    }
    return scraped.url() != null
        && jobListingRepository.findByUserIdAndUrl(userId, scraped.url()).isPresent();
  }

  private void scoreQuietly(UUID userId, JobListing job) {
    try {
      if (ai.available() && job.getJobDescriptionText() != null) {
        var parsed = ai.parseJobDescription(job.getJobDescriptionText());
        job.setRequiredSkills(parsed.requiredSkills());
        job.setNiceToHaveSkills(parsed.niceToHaveSkills());
        job.setParseStatus(ProcessingStatus.COMPLETED);
      }
      JobFitResult result = jobMatchingService.score(userId, job);
      job.setFitScore(result.score());
      job.setFitExplanation(result.explanation());
    } catch (RuntimeException exception) {
      job.setParseStatus(ProcessingStatus.FAILED);
      log.warn("scoring scraped job {} failed: {}", job.getId(), exception.getMessage());
    }
  }

  private Company resolveCompany(UUID userId, String name) {
    return companyRepository
        .findByUserIdAndNameIgnoreCase(userId, name.trim())
        .orElseGet(() -> companyRepository.save(Company.builder().userId(userId).name(name.trim()).build()));
  }

  private static <E extends Enum<E>> E parseEnum(Class<E> type, String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return Enum.valueOf(type, raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }
}
