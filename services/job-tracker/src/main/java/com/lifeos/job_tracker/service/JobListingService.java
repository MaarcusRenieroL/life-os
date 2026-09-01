package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.CreateJobListingRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateJobListingRequest;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.domains.record.ParsedJobDescription;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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
  private final JobEventProducer eventProducer;

  @Transactional(readOnly = true)
  public JobListing get(UUID userId, UUID jobId) {
    return jobListingRepository
        .findByIdAndUserId(jobId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Job listing", jobId));
  }

  @Transactional(readOnly = true)
  public List<JobListing> saved(UUID userId) {
    return jobListingRepository.findAllByUserIdAndSavedIsTrueOrderByCreatedAtDesc(userId);
  }

  @Transactional(readOnly = true)
  public Page<JobListing> curated(UUID userId, LocalDate since, int page, int size) {
    return jobListingRepository.findCurated(userId, since, PageRequest.of(page, Math.min(size, 100)));
  }

  @Transactional(readOnly = true)
  public Page<JobListing> search(
      UUID userId,
      String q,
      String location,
      java.math.BigDecimal salaryMin,
      WorkModel workModel,
      SeniorityLevel seniority,
      String source,
      Integer minScore,
      int page,
      int size) {
    Specification<JobListing> spec =
        Specification.allOf(
            JobListingSpecifications.ownedBy(userId),
            JobListingSpecifications.notDismissed(),
            JobListingSpecifications.textLike(q),
            JobListingSpecifications.locationLike(location),
            JobListingSpecifications.salaryAtLeast(salaryMin),
            JobListingSpecifications.workModel(workModel),
            JobListingSpecifications.seniority(seniority),
            JobListingSpecifications.source(source),
            JobListingSpecifications.minScore(minScore));

    Pageable pageable =
        PageRequest.of(
            page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "fitScore", "createdAt"));
    return jobListingRepository.findAll(spec, pageable);
  }

  @Transactional
  public JobListing create(UUID userId, CreateJobListingRequest request) {
    Company company = resolveCompany(userId, request.company());

    JobListing job =
        jobListingRepository.save(
            JobListing.builder()
                .userId(userId)
                .companyId(company == null ? null : company.getId())
                .title(request.title())
                .company(request.company())
                .location(request.location())
                .workModel(request.workModel())
                .url(request.url())
                .source(request.source() == null ? "manual" : request.source())
                .jobDescriptionText(request.jobDescriptionText())
                .salaryMin(request.salaryMin())
                .salaryMax(request.salaryMax())
                .currency(request.currency())
                .postedDate(request.postedDate())
                .deadline(request.deadline())
                .seniorityLevel(request.seniorityLevel())
                .visaSponsorship(
                    request.visaSponsorship() == null ? VisaSponsorship.UNKNOWN : request.visaSponsorship())
                .industry(request.industry())
                .tags(request.tags())
                .parseStatus(ProcessingStatus.PENDING)
                .build());

    boolean wantsParse = !Boolean.FALSE.equals(request.parseWithAi());
    if (wantsParse && ai.available() && job.getJobDescriptionText() != null) {
      parseAndScore(userId, job);
    }

    eventProducer.emit(
        JobEventTopics.JOB_DISCOVERED,
        userId,
        Map.of("jobId", job.getId().toString(), "title", job.getTitle(), "company", job.getCompany()));

    return jobListingRepository.save(job);
  }

  @Transactional
  public JobListing update(UUID userId, UUID jobId, UpdateJobListingRequest request) {
    JobListing job = get(userId, jobId);
    if (request.saved() != null) {
      job.setSaved(request.saved());
    }
    if (request.dismissed() != null) {
      job.setDismissed(request.dismissed());
    }
    if (request.tags() != null) {
      job.setTags(request.tags());
    }
    return jobListingRepository.save(job);
  }

  @Transactional
  public JobFitResult scoreAndPersist(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    JobFitResult result = jobMatchingService.score(userId, job);
    job.setFitScore(result.score());
    job.setFitExplanation(result.explanation());
    jobListingRepository.save(job);
    eventProducer.emit(
        JobEventTopics.JOB_SCORING,
        userId,
        Map.of("jobId", jobId.toString(), "score", result.score()));
    return result;
  }

  private void parseAndScore(UUID userId, JobListing job) {
    try {
      job.setParseStatus(ProcessingStatus.PROCESSING);
      ParsedJobDescription parsed = ai.parseJobDescription(job.getJobDescriptionText());
      job.setRequiredSkills(parsed.requiredSkills());
      job.setNiceToHaveSkills(parsed.niceToHaveSkills());
      if (job.getSeniorityLevel() == null) {
        job.setSeniorityLevel(parseEnum(SeniorityLevel.class, parsed.seniorityLevel()));
      }
      if (job.getWorkModel() == null) {
        job.setWorkModel(parseEnum(WorkModel.class, parsed.workModel()));
      }
      if (job.getIndustry() == null) {
        job.setIndustry(parsed.industry());
      }
      job.setParseStatus(ProcessingStatus.COMPLETED);

      JobFitResult result = jobMatchingService.score(userId, job);
      job.setFitScore(result.score());
      job.setFitExplanation(result.explanation());
    } catch (RuntimeException exception) {
      log.warn("job {} parse/score failed: {}", job.getId(), exception.getMessage());
      job.setParseStatus(ProcessingStatus.FAILED);
    }
  }

  private Company resolveCompany(UUID userId, String name) {
    if (name == null || name.isBlank()) {
      return null;
    }
    return companyRepository
        .findByUserIdAndNameIgnoreCase(userId, name.trim())
        .orElseGet(
            () ->
                companyRepository.save(
                    Company.builder().userId(userId).name(name.trim()).build()));
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
