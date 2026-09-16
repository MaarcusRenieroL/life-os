package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpdateJobDetailsRequest;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.JobStatusHistory;
import com.lifeos.job_tracker.domains.entity.JobTailoringVersion;
import com.lifeos.job_tracker.domains.entity.Resume;
import com.lifeos.job_tracker.domains.enums.IngestSource;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.domains.record.ResumeTailoringResult;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.JobLinkUnreadableException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.JobLinkFetcher;
import com.lifeos.job_tracker.integration.LatexCompiler;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.JobStatusHistoryRepository;
import com.lifeos.job_tracker.repository.JobTailoringVersionRepository;
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
  private final ResumeService resumeService;
  private final LatexCompiler latexCompiler;
  private final SkillService skillService;
  private final JobTailoringVersionRepository jobTailoringVersionRepository;
  private final JobStatusHistoryRepository jobStatusHistoryRepository;

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
          "Parsing a job link needs an AI provider; set ANTHROPIC_API_KEY or enable Ollama");
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
    job = jobListingRepository.save(job);
    recordStatusChange(userId, job.getId(), null, job.getStatus());
    return job;
  }

  @Transactional
  public JobListing updateStatus(UUID userId, UUID jobId, JobStatus status) {
    JobListing job = get(userId, jobId);
    JobStatus previous = job.getStatus();
    if (status == JobStatus.APPLIED && job.getAppliedAt() == null) {
      job.setAppliedAt(java.time.LocalDate.now());
    }
    job.setStatus(status);
    job = jobListingRepository.save(job);
    if (previous != status) {
      recordStatusChange(userId, jobId, previous, status);
    }
    return job;
  }

  private void recordStatusChange(UUID userId, UUID jobId, JobStatus from, JobStatus to) {
    jobStatusHistoryRepository.save(
        JobStatusHistory.builder().jobId(jobId).userId(userId).fromStatus(from).toStatus(to).build());
  }

  /** Stashes a rejection reason (e.g. the triggering email's snippet) without clobbering one the
   * candidate already wrote themselves. */
  @Transactional
  public void setRejectionReasonIfAbsent(UUID userId, UUID jobId, String reason) {
    JobListing job = get(userId, jobId);
    if (job.getRejectionReason() == null || job.getRejectionReason().isBlank()) {
      job.setRejectionReason(reason);
      jobListingRepository.save(job);
    }
  }

  @Transactional
  public JobListing updateDetails(UUID userId, UUID jobId, UpdateJobDetailsRequest request) {
    JobListing job = get(userId, jobId);
    job.setNotes(request.notes());
    job.setAppliedAt(request.appliedAt());
    job.setRejectionReason(request.rejectionReason());
    job.setOfferAmount(request.offerAmount());
    job.setOfferDeadline(request.offerDeadline());
    job.setOfferNotes(request.offerNotes());
    job.setFollowUpAt(request.followUpAt());
    return jobListingRepository.save(job);
  }

  /** Drafts a cover letter for this job from the candidate's real resume - same "never invent
   * experience" constraint as tailorResume, and the same one-shot-overwrite model tailoring had
   * before versioning (no history yet; add it if this turns out to need re-drafting often). */
  @Transactional
  public JobListing generateCoverLetter(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      throw new InvalidRequestException("This job has no description text to draft a cover letter against");
    }
    Resume resume = resumeService.getCurrent(userId);
    if (resume.getRawText() == null || resume.getRawText().isBlank()) {
      throw new InvalidRequestException("Upload a resume with readable text before drafting a cover letter");
    }
    if (!ai.available()) {
      throw new InvalidRequestException("Drafting a cover letter needs an AI provider; set ANTHROPIC_API_KEY or enable Ollama");
    }

    String letter = ai.generateCoverLetter(job.getTitle(), job.getCompany(), job.getJobDescriptionText(), resume.getRawText());
    job.setCoverLetterText(letter);
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

  /**
   * Scores the saved resume against one job listing's real requirements, then asks Claude for
   * concrete resume-improvement points and a full LaTeX resume tailored to that job, ready to paste
   * into Overleaf.
   */
  @Transactional
  public ResumeTailoringResult tailorResume(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      throw new InvalidRequestException("This job has no description text to tailor a resume against");
    }

    Resume resume = resumeService.getCurrent(userId);
    if (resume.getRawText() == null || resume.getRawText().isBlank()) {
      throw new InvalidRequestException("Upload a resume with readable text before tailoring it");
    }

    if (!ai.claudeAvailable()) {
      throw new InvalidRequestException(
          "Tailoring a resume needs Claude; set ANTHROPIC_API_KEY to enable it");
    }

    JobFitResult fit = jobMatchingService.score(userId, job);
    @SuppressWarnings("unchecked")
    List<String> missingSkills =
        (List<String>) fit.explanation().getOrDefault("missingSkills", List.of());
    @SuppressWarnings("unchecked")
    List<String> partialSkills =
        (List<String>) fit.explanation().getOrDefault("partialMatches", List.of());

    ResumeTailoringResult result =
        ai.tailorResume(
            job.getTitle(),
            job.getCompany(),
            job.getJobDescriptionText(),
            job.getRequiredSkills(),
            missingSkills,
            partialSkills,
            resume.getRawText());

    // The prompt already asks for one page, but LLM length estimates are unreliable - actually
    // compile it and, if it overflowed, retry once with a hard "cut it down" instruction rather
    // than silently handing back a two-page resume.
    byte[] pdf = latexCompiler.compile(result.latexResume());
    if (latexCompiler.pageCount(pdf) > 1) {
      ResumeTailoringResult retry =
          ai.tailorResume(
              job.getTitle(),
              job.getCompany(),
              job.getJobDescriptionText(),
              job.getRequiredSkills(),
              missingSkills,
              partialSkills,
              resume.getRawText(),
              "The previous attempt ran onto a second page. Cut content - shorten bullets and"
                  + " drop the least-relevant ones - so it fits on exactly one page.");
      byte[] retryPdf = latexCompiler.compile(retry.latexResume());
      if (latexCompiler.pageCount(retryPdf) <= latexCompiler.pageCount(pdf)) {
        result = retry;
      }
    }

    job.setTailoredImprovementPoints(result.improvementPoints());
    job.setTailoredLatexResume(result.latexResume());

    // The tailored resume only ever rewords/surfaces skills the candidate genuinely has (the
    // prompt forbids inventing anything) - merging what Claude notices in it can still catch real
    // skills the original resume parse missed, so the fit score reflects the improved wording
    // instead of staying frozen at the pre-tailor number.
    mergeSkillsFromTailoredResume(userId, result.latexResume());
    JobFitResult rescored = jobMatchingService.score(userId, job);
    job.setFitScore(rescored.score());
    job.setFitExplanation(rescored.explanation());

    jobListingRepository.save(job);
    saveVersion(userId, job, result, rescored.score());

    return result;
  }

  private void mergeSkillsFromTailoredResume(UUID userId, String tailoredLatexResume) {
    try {
      ParsedResume parsed = ai.parseResume(tailoredLatexResume);
      skillService.mergeExtracted(userId, parsed.skills());
    } catch (RuntimeException exception) {
      log.warn("Could not extract skills from tailored resume: {}", exception.getMessage());
    }
  }

  private void saveVersion(UUID userId, JobListing job, ResumeTailoringResult result, int fitScore) {
    int nextVersion = jobTailoringVersionRepository.countByJobId(job.getId()) + 1;
    jobTailoringVersionRepository.save(
        JobTailoringVersion.builder()
            .jobId(job.getId())
            .userId(userId)
            .version(nextVersion)
            .improvementPoints(result.improvementPoints())
            .latexResume(result.latexResume())
            .fitScore(fitScore)
            .build());
  }

  @Transactional(readOnly = true)
  public List<JobTailoringVersion> tailoringVersions(UUID userId, UUID jobId) {
    get(userId, jobId); // 404s if the job isn't the caller's
    return jobTailoringVersionRepository.findByJobIdAndUserIdOrderByVersionDesc(jobId, userId);
  }

  @Transactional(readOnly = true)
  public byte[] renderTailoringVersionPdf(UUID userId, UUID jobId, UUID versionId) {
    get(userId, jobId);
    JobTailoringVersion version =
        jobTailoringVersionRepository
            .findByIdAndUserId(versionId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Tailored resume version", versionId));
    return latexCompiler.compile(version.getLatexResume());
  }

  /** Compiles the job's saved tailored LaTeX (from {@link #tailorResume}) to PDF bytes. */
  @Transactional(readOnly = true)
  public byte[] renderTailoredResumePdf(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    if (job.getTailoredLatexResume() == null || job.getTailoredLatexResume().isBlank()) {
      throw new InvalidRequestException("Tailor a resume for this job before rendering a PDF");
    }
    return latexCompiler.compile(job.getTailoredLatexResume());
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
