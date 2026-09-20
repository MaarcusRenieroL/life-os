package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpdateJobDetailsRequest;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.JobStatusHistory;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.FitScoreSource;
import com.lifeos.job_tracker.domains.enums.IngestSource;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.domains.record.AtsSuggestions;
import com.lifeos.job_tracker.domains.record.ExtractedSkill;
import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.JobLinkUnreadableException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.JobLinkFetcher;
import com.lifeos.job_tracker.integration.PdfTextExtractor;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.JobStatusHistoryRepository;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class JobListingService {

  private static final Logger log = LoggerFactory.getLogger(JobListingService.class);

  // The job listing (GET /v1/jobs) endpoint returns a flat array the frontend consumes directly
  // (apps/web/src/features/job-tracker/jobs-list-page.tsx expects JobListing[], not a Page). To
  // avoid a frontend/API contract break, list() stays a flat List but is capped here instead of
  // pulling every job a user has ever added - ordered by fit score desc as before, so this only
  // ever trims the long tail of old/low-fit listings off the end.
  private static final int LIST_LIMIT = 200;

  private final JobListingRepository jobListingRepository;
  private final CompanyRepository companyRepository;
  private final AiAssistant ai;
  private final JobMatchingService jobMatchingService;
  private final JobLinkFetcher jobLinkFetcher;
  private final CareerProfileService careerProfileService;
  private final PdfTextExtractor pdfTextExtractor;
  private final SkillService skillService;
  private final JobStatusHistoryRepository jobStatusHistoryRepository;

  @Transactional(readOnly = true)
  public List<JobListing> list(UUID userId) {
    return jobListingRepository.findAllForUser(userId, PageRequest.of(0, LIST_LIMIT));
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

  /** Drafts a cover letter for this job from whichever resume currently represents the candidate
   * for it - the job-specific override upload if one exists, otherwise the global saved resume. */
  @Transactional
  public JobListing generateCoverLetter(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      throw new InvalidRequestException("This job has no description text to draft a cover letter against");
    }
    String resumeText = resolveBaseResumeText(userId, job);
    if (resumeText == null || resumeText.isBlank()) {
      throw new InvalidRequestException("Upload a resume with readable text before drafting a cover letter");
    }
    if (!ai.available()) {
      throw new InvalidRequestException("Drafting a cover letter needs an AI provider; set ANTHROPIC_API_KEY or enable Ollama");
    }

    String letter = ai.generateCoverLetter(job.getTitle(), job.getCompany(), job.getJobDescriptionText(), resumeText);
    job.setCoverLetterText(letter);
    return jobListingRepository.save(job);
  }

  /**
   * The single "Re-score" entry point. Picks the most specific resume available for this job -
   * an uploaded override beats the candidate's whole persisted skill library - and scores
   * against that, so the candidate never has to know or remember which button to press.
   */
  @Transactional
  public JobFitResult rescore(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    return recomputeFitScore(userId, job);
  }

  private JobFitResult recomputeFitScore(UUID userId, JobListing job) {
    JobFitResult result;
    FitScoreSource source;
    if (job.getOverrideResumeText() != null && !job.getOverrideResumeText().isBlank()) {
      result = jobMatchingService.score(job, resolveOverrideSkills(userId, job));
      source = FitScoreSource.OVERRIDE_RESUME;
    } else {
      result = jobMatchingService.score(userId, job);
      source = FitScoreSource.LIBRARY;
    }
    job.setFitScore(result.score());
    job.setFitExplanation(result.explanation());
    job.setFitScoreSource(source);
    jobListingRepository.save(job);
    return result;
  }

  /** Extracted skills are cached on the job at upload time so repeat re-scores of the same
   * override resume don't re-invoke the AI - besides the wasted cost, Ollama's extraction is
   * non-deterministic, so re-parsing on every click could make the score drift with no visible
   * cause. Only re-parses (and re-caches) if the cache is somehow missing. */
  private List<Skill> resolveOverrideSkills(UUID userId, JobListing job) {
    if (job.getOverrideResumeSkills() == null) {
      List<ExtractedSkill> parsed = safeParseSkills(job.getOverrideResumeText());
      job.setOverrideResumeSkills(parsed);
    }
    return skillService.toTransientSkills(job.getOverrideResumeSkills());
  }

  private List<ExtractedSkill> safeParseSkills(String text) {
    if (!ai.available() || text == null || text.isBlank()) {
      return List.of();
    }
    try {
      return ai.parseResume(text).skills();
    } catch (RuntimeException exception) {
      log.warn("Could not extract skills for rescoring: {}", exception.getMessage());
      return List.of();
    }
  }

  /** The resume text {@link #getAtsSuggestions} and {@link #generateCoverLetter} build from -
   * this job's uploaded override if one exists, otherwise the candidate's full career profile
   * (contact info, summary, every work experience/project with real bullets and links, and the
   * full skill library) - not a single static resume's text. */
  private String resolveBaseResumeText(UUID userId, JobListing job) {
    if (job.getOverrideResumeText() != null && !job.getOverrideResumeText().isBlank()) {
      return job.getOverrideResumeText();
    }
    return careerProfileService.buildProfileText(userId);
  }

  /**
   * Attaches a one-off resume to this specific job - e.g. one built with a different tool that
   * the candidate wants to check without touching their persisted skill library. Replaces any
   * previous override for this job.
   */
  @Transactional
  public JobListing uploadResumeOverride(UUID userId, UUID jobId, MultipartFile file) {
    JobListing job = get(userId, jobId);
    if (file == null || file.isEmpty()) {
      throw new InvalidRequestException("No file was uploaded");
    }

    byte[] bytes;
    try {
      bytes = file.getBytes();
    } catch (java.io.IOException exception) {
      throw new InvalidRequestException("Could not read the uploaded file");
    }

    boolean looksLikePdf =
        bytes.length >= 4 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F';
    boolean namedPdf =
        file.getOriginalFilename() != null
            && file.getOriginalFilename().toLowerCase().endsWith(".pdf");
    if (!looksLikePdf && !namedPdf) {
      throw new InvalidRequestException("Only PDF resumes are supported");
    }

    String text = pdfTextExtractor.extract(bytes);
    if (text == null || text.isBlank()) {
      throw new InvalidRequestException("Could not read text from this PDF");
    }

    job.setOverrideResumeText(text);
    job.setOverrideResumeFileName(
        file.getOriginalFilename() == null ? "resume.pdf" : file.getOriginalFilename());
    job.setOverrideResumeUploadedAt(Instant.now());
    // Clear the stale cache from any previous override so resolveOverrideSkills re-parses this
    // one instead of scoring against the file that was just replaced.
    job.setOverrideResumeSkills(null);
    jobListingRepository.save(job);
    recomputeFitScore(userId, job);
    return job;
  }

  @Transactional
  public JobListing deleteResumeOverride(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    job.setOverrideResumeText(null);
    job.setOverrideResumeFileName(null);
    job.setOverrideResumeUploadedAt(null);
    job.setOverrideResumeSkills(null);
    jobListingRepository.save(job);
    recomputeFitScore(userId, job);
    return job;
  }

  /**
   * Scores the candidate's most specific resume for this job (an uploaded override if there is
   * one, otherwise the global saved resume) against the job's real requirements, then asks for
   * concrete, wording-only edit suggestions the candidate applies to their own resume by hand.
   * No resume is rewritten or generated here - text advice only.
   */
  @Transactional
  public JobListing getAtsSuggestions(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      throw new InvalidRequestException("This job has no description text to compare against");
    }

    boolean hasOverride = job.getOverrideResumeText() != null && !job.getOverrideResumeText().isBlank();
    String baseResumeText = resolveBaseResumeText(userId, job);
    if (baseResumeText == null || baseResumeText.isBlank()) {
      throw new InvalidRequestException("Upload a resume with readable text before requesting suggestions");
    }
    if (!ai.available()) {
      throw new InvalidRequestException(
          "ATS suggestions need an AI provider; set ANTHROPIC_API_KEY or enable Ollama");
    }

    // Gap analysis has to be computed against the SAME resume being compared - scoring against
    // the global library while advising on an override resume would suggest fixes for gaps that
    // resume doesn't actually have (or hide ones it does).
    List<Skill> baseSkills = hasOverride ? resolveOverrideSkills(userId, job) : skillService.list(userId);
    JobFitResult fit = jobMatchingService.score(job, baseSkills);
    @SuppressWarnings("unchecked")
    List<String> missingSkills =
        (List<String>) fit.explanation().getOrDefault("missingSkills", List.of());
    @SuppressWarnings("unchecked")
    List<String> partialSkills =
        (List<String>) fit.explanation().getOrDefault("partialMatches", List.of());
    List<String> candidateSkillNames = baseSkills.stream().map(Skill::getName).toList();

    AtsSuggestions result =
        ai.generateAtsSuggestions(
            job.getTitle(),
            job.getCompany(),
            job.getJobDescriptionText(),
            job.getRequiredSkills(),
            missingSkills,
            partialSkills,
            baseResumeText,
            candidateSkillNames);

    job.setAtsSuggestions(result.suggestions());
    job.setAtsSuggestionGaps(result.gapsVsJd());
    return jobListingRepository.save(job);
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
      job.setFitScoreSource(FitScoreSource.LIBRARY);
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
