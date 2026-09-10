package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.IngestSource;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.JobLinkUnreadableException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.JobLinkFetcher;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class JobListingService {

  private static final Logger log = LoggerFactory.getLogger(JobListingService.class);

  private final JobListingRepository jobListingRepository;
  private final CompanyRepository companyRepository;
  private final AiAssistant ai;
  private final JobMatchingService jobMatchingService;
  private final JobLinkFetcher jobLinkFetcher;

  @Transactional(readOnly = true)
  public List<JobListing> list(UUID userId) {
    return jobListingRepository.findAllForUser(userId);
  }

  @Transactional(readOnly = true)
  public JobListing get(UUID userId, UUID jobId) {
    return jobListingRepository
        .findByIdAndUserId(jobId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Job listing", jobId));
  }

  /**
   * Turns a pasted job URL (or pasted description text, when the site blocks server reads) into a
   * scored {@link JobListing}. The URL is fetched server-side, reduced to text, structured by
   * Claude, then scored against the candidate's saved resume.
   */
  @Transactional
  public JobListing createFromLink(UUID userId, String url, String pastedText) {
    String sourceUrl = (url == null || url.isBlank()) ? null : url.trim();
    boolean hasText = pastedText != null && !pastedText.isBlank();

    if (sourceUrl != null) {
      var existing = jobListingRepository.findByUserIdAndUrl(userId, sourceUrl);
      if (existing.isPresent()) {
        return existing.get();
      }
    }

    String rawContent;
    if (hasText) {
      rawContent = "--- PAGE TEXT ---\n" + pastedText.trim();
    } else if (sourceUrl != null) {
      if (!sourceUrl.startsWith("http://") && !sourceUrl.startsWith("https://")) {
        throw new InvalidRequestException("Enter a full job URL starting with http:// or https://");
      }
      rawContent = jobLinkFetcher.fetch(sourceUrl).content();
    } else {
      throw new InvalidRequestException("Provide a job link or paste the job description text");
    }

    if (!ai.available()) {
      throw new InvalidRequestException(
          "Parsing a job link needs Claude; set ANTHROPIC_API_KEY to enable it");
    }

    ParsedJobPosting parsed;
    try {
      parsed = ai.parseJobPosting(rawContent);
    } catch (RuntimeException exception) {
      throw new JobLinkUnreadableException(
          "Couldn't read a job posting from that page (" + exception.getMessage() + "). Paste the"
              + " job description text instead.");
    }
    if (parsed == null || (isBlank(parsed.title()) && isBlank(parsed.jobDescriptionText()))) {
      throw new JobLinkUnreadableException(
          "That didn't look like a job posting. Paste the job description text instead.");
    }

    String company = isBlank(parsed.company()) ? "Unknown company" : parsed.company().trim();
    Company companyEntity = resolveCompany(userId, company);
    String descriptionText =
        !isBlank(parsed.jobDescriptionText())
            ? parsed.jobDescriptionText()
            : (hasText ? pastedText.trim() : null);

    JobListing job =
        jobListingRepository.save(
            JobListing.builder()
                .userId(userId)
                .companyId(companyEntity == null ? null : companyEntity.getId())
                .title(isBlank(parsed.title()) ? "Untitled role" : parsed.title().trim())
                .company(company)
                .location(parsed.location())
                .workModel(parseEnum(WorkModel.class, parsed.workModel()))
                .seniorityLevel(parseEnum(SeniorityLevel.class, parsed.seniorityLevel()))
                .industry(parsed.industry())
                .salaryMin(parsed.salaryMin())
                .salaryMax(parsed.salaryMax())
                .currency(parsed.currency())
                .url(sourceUrl)
                .jobDescriptionText(descriptionText)
                .requiredSkills(parsed.requiredSkills())
                .niceToHaveSkills(parsed.niceToHaveSkills())
                .source("link")
                .ingestedBy(IngestSource.LINK)
                .visaSponsorship(VisaSponsorship.UNKNOWN)
                .status(JobStatus.INTERESTED)
                .parseStatus(ProcessingStatus.COMPLETED)
                .build());

    scoreQuietly(userId, job);
    return jobListingRepository.save(job);
  }

  @Transactional
  public JobListing updateStatus(UUID userId, UUID jobId, JobStatus status) {
    JobListing job = get(userId, jobId);
    job.setStatus(status);
    return jobListingRepository.save(job);
  }

  @Transactional
  public JobFitResult rescore(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    JobFitResult result = jobMatchingService.score(userId, job);
    job.setFitScore(result.score());
    job.setFitExplanation(result.explanation());
    jobListingRepository.save(job);
    return result;
  }

  @Transactional
  public void delete(UUID userId, UUID jobId) {
    jobListingRepository.delete(get(userId, jobId));
  }

  private void scoreQuietly(UUID userId, JobListing job) {
    try {
      JobFitResult result = jobMatchingService.score(userId, job);
      job.setFitScore(result.score());
      job.setFitExplanation(result.explanation());
    } catch (RuntimeException exception) {
      log.warn("scoring job {} failed: {}", job.getId(), exception.getMessage());
    }
  }

  private Company resolveCompany(UUID userId, String name) {
    if (name == null || name.isBlank()) {
      return null;
    }
    return companyRepository
        .findByUserIdAndNameIgnoreCase(userId, name.trim())
        .orElseGet(
            () -> companyRepository.save(Company.builder().userId(userId).name(name.trim()).build()));
  }

  private static boolean isBlank(String s) {
    return s == null || s.isBlank();
  }

  private static <E extends Enum<E>> E parseEnum(Class<E> type, String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    try {
      return Enum.valueOf(type, raw.trim().toUpperCase());
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }
}
