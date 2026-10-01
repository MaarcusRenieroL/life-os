package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpdateJobDetailsRequest;
import com.lifeos.job_tracker.domains.entity.CareerProfile;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.DiscoveredJob;
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
import com.lifeos.job_tracker.domains.record.KnownPerson;
import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
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
    String sourceUrl = canonicalUrl(url);
    if (sourceUrl != null) {
      var existing = jobListingRepository.findByUserIdAndUrl(userId, sourceUrl);
      if (existing.isPresent()) {
        return existing.get();
      }
    }

    LinkedPosting posting = readPosting(sourceUrl, pastedText);
    ParsedJobPosting parsed = posting.parsed();
    String descriptionText = posting.descriptionText();

    String company = isBlank(parsed.company()) ? "Unknown company" : parsed.company().trim();
    Company companyEntity = resolveCompany(userId, company);
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

  /** A job page read and structured, with the description text to store. */
  private record LinkedPosting(ParsedJobPosting parsed, String descriptionText) {}

  /**
   * Reads a posting from a URL (or from pasted text, when the site blocks server reads) and has the
   * AI structure it. Shared by "add from link" and "attach a link to a job I already track".
   */
  private LinkedPosting readPosting(String sourceUrl, String pastedText) {
    boolean hasText = pastedText != null && !pastedText.isBlank();

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

    String descriptionText =
        !isBlank(parsed.jobDescriptionText())
            ? parsed.jobDescriptionText()
            : (hasText ? pastedText.trim() : null);
    return new LinkedPosting(parsed, descriptionText);
  }

  /**
   * Normalises a job link so the same posting always has the same URL: LinkedIn links come with
   * tracking parameters (and sometimes only a {@code currentJobId}), which would otherwise defeat
   * duplicate detection.
   */
  public static String canonicalUrl(String url) {
    if (url == null || url.isBlank()) {
      return null;
    }
    String trimmed = url.trim();
    java.util.regex.Matcher view =
        java.util.regex.Pattern.compile("linkedin\\.com/(?:comm/)?jobs/view/(?:[^/?#]*-)?(\\d+)").matcher(trimmed);
    if (view.find()) {
      return "https://www.linkedin.com/jobs/view/" + view.group(1) + "/";
    }
    java.util.regex.Matcher current =
        java.util.regex.Pattern.compile("linkedin\\.com/jobs/[^?#]*\\?[^#]*currentJobId=(\\d+)").matcher(trimmed);
    if (current.find()) {
      return "https://www.linkedin.com/jobs/view/" + current.group(1) + "/";
    }
    return trimmed;
  }

  /**
   * Fills in a job that was created from an email (company and title only) from its posting: the
   * link is read, structured, and scored against the candidate. What the candidate already knows -
   * status, applied date, an existing title - is never overwritten; only gaps are filled, and the
   * description, skills and score always come from the posting.
   */
  @Transactional
  public JobListing attachLink(UUID userId, UUID jobId, String url, String pastedText) {
    JobListing job = get(userId, jobId);
    String sourceUrl = canonicalUrl(url);

    if (sourceUrl != null) {
      var other = jobListingRepository.findByUserIdAndUrl(userId, sourceUrl);
      if (other.isPresent() && !other.get().getId().equals(jobId)) {
        throw new InvalidRequestException(
            "That link is already on another job: \"" + other.get().getTitle() + "\" at " + other.get().getCompany());
      }
    }

    LinkedPosting posting = readPosting(sourceUrl, pastedText);
    ParsedJobPosting parsed = posting.parsed();

    if (sourceUrl != null) {
      job.setUrl(sourceUrl);
    }
    if (isBlank(job.getTitle()) || "Untitled role".equals(job.getTitle())) {
      if (!isBlank(parsed.title())) {
        job.setTitle(parsed.title().trim());
      }
    }
    if (isBlank(job.getLocation())) job.setLocation(parsed.location());
    if (job.getWorkModel() == null) job.setWorkModel(parseEnum(WorkModel.class, parsed.workModel()));
    if (job.getSeniorityLevel() == null) job.setSeniorityLevel(parseEnum(SeniorityLevel.class, parsed.seniorityLevel()));
    if (isBlank(job.getIndustry())) job.setIndustry(parsed.industry());
    if (job.getSalaryMin() == null) job.setSalaryMin(parsed.salaryMin());
    if (job.getSalaryMax() == null) job.setSalaryMax(parsed.salaryMax());
    if (isBlank(job.getCurrency())) job.setCurrency(parsed.currency());
    if (!isBlank(posting.descriptionText())) job.setJobDescriptionText(posting.descriptionText());
    if (parsed.requiredSkills() != null) job.setRequiredSkills(parsed.requiredSkills());
    if (parsed.niceToHaveSkills() != null) job.setNiceToHaveSkills(parsed.niceToHaveSkills());
    // Stale suggestions were written against the old (empty) description; the page regenerates them.
    job.setAtsSuggestions(null);
    job.setAtsSuggestionGaps(null);

    JobListing saved = jobListingRepository.save(job);
    try {
      recomputeFitScore(userId, saved);
    } catch (RuntimeException exception) {
      log.warn("scoring job {} after attaching a link failed: {}", jobId, exception.getMessage());
    }
    return jobListingRepository.save(saved);
  }

  /**
   * Seeds a minimal {@link JobListing} from core's quick-capture flow - the candidate typed one
   * line of free text somewhere in the app (e.g. "applied to Stripe for backend engineer"), core's
   * AI classifier extracted a company and title from it, and that's all we get here: no URL, no
   * description text to parse or score against. Starts at {@link JobStatus#INTERESTED} like every
   * other creation path in this service ({@link #createFromLink}, the email digest path via {@code
   * EmailEventService.createDigestJobs}) - the candidate's pipeline stage is a deliberate,
   * separate action via {@link #updateStatus}, never inferred at creation time even when the
   * captured text says "applied".
   */
  @Transactional
  public JobListing createFromQuickCapture(UUID userId, String company, String title) {
    if (isBlank(company) && isBlank(title)) {
      throw new InvalidRequestException("Quick capture needs at least a company or a title");
    }

    String companyName = isBlank(company) ? "Unknown company" : company.trim();
    Company companyEntity = resolveCompany(userId, companyName);

    JobListing job =
        jobListingRepository.save(
            JobListing.builder()
                .userId(userId)
                .companyId(companyEntity == null ? null : companyEntity.getId())
                .title(isBlank(title) ? "Untitled role" : title.trim())
                .company(companyName)
                .source("quick-capture")
                .ingestedBy(IngestSource.MANUAL)
                .visaSponsorship(VisaSponsorship.UNKNOWN)
                .status(JobStatus.INTERESTED)
                .parseStatus(ProcessingStatus.COMPLETED)
                .build());

    recordStatusChange(userId, job.getId(), null, job.getStatus());
    return job;
  }

  /**
   * Turns a discovery inbox hit into a tracked job. The listing text came straight from the
   * company's own board, so it is parsed for required skills when an AI provider is available (so
   * the precise fit score has something to compare against) but promoting never fails just because
   * parsing did - the job is still created, INTERESTED, with the discovery score as its baseline.
   */
  /** People the candidate knows at this job's company. Empty when none are noted. */
  @Transactional(readOnly = true)
  public List<KnownPerson> knownPeople(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    if (job.getCompanyId() == null) {
      return List.of();
    }
    return companyRepository
        .findByIdAndUserId(job.getCompanyId(), userId)
        .map(Company::getKnownPeople)
        .orElse(List.of());
  }

  /** Replaces the list. Held on the company so it carries over to every role there. */
  @Transactional
  public List<KnownPerson> saveKnownPeople(UUID userId, UUID jobId, List<KnownPerson> people) {
    JobListing job = get(userId, jobId);
    List<KnownPerson> cleaned =
        (people == null ? List.<KnownPerson>of() : people).stream()
            .filter(p -> p != null && !isBlank(p.name()))
            .map(p -> new KnownPerson(p.name().trim(), isBlank(p.note()) ? null : p.note().trim()))
            .limit(30)
            .toList();

    Company company =
        job.getCompanyId() == null
            ? null
            : companyRepository.findByIdAndUserId(job.getCompanyId(), userId).orElse(null);
    if (company == null) {
      company = resolveCompany(userId, job.getCompany());
      if (company == null) {
        throw new InvalidRequestException("This job has no company to attach people to");
      }
      job.setCompanyId(company.getId());
      jobListingRepository.save(job);
    }
    company.setKnownPeople(cleaned);
    companyRepository.save(company);
    return cleaned;
  }

  /**
   * The candidate's standard referral ask, filled in for this job - the same fixed template they
   * have always sent by hand. Deliberately not AI-written: it is short and personal, and a
   * template in their own words never needs a "does this sound odd" check before sending.
   *
   * @param contactName optional; only the first word is used in the greeting
   */
  @Transactional(readOnly = true)
  public String referralMessage(UUID userId, UUID jobId, String contactName) {
    JobListing job = get(userId, jobId);
    CareerProfile profile = careerProfileService.getProfileOrNull(userId);
    String contactFirstName = firstWord(contactName);
    String signOff = firstWord(profile == null ? null : profile.getFullName());

    return "Hi" + (contactFirstName.isEmpty() ? "" : " " + contactFirstName) + ",\n\n"
        + "Hope you are doing good.\n"
        + "I found an opening at " + job.getCompany() + " for the role " + job.getTitle()
        + " and am very interested in applying for the same.\n\n"
        + "Could you please help me with a referral?\n"
        + "Job Id: " + (job.getExternalId() == null ? "" : job.getExternalId()) + "\n"
        + "Job Link: " + (job.getUrl() == null ? "" : job.getUrl()) + "\n\n"
        + "Regards,\n"
        + signOff;
  }

  /** Discovery keys jobs as {@code board:slug:id}; the job id a recruiter recognises is the last part. */
  private static String boardNativeId(String discoveryKey) {
    if (discoveryKey == null) {
      return null;
    }
    String[] parts = discoveryKey.split(":", 3);
    return parts.length == 3 ? parts[2] : discoveryKey;
  }

  private static String firstWord(String value) {
    if (value == null || value.isBlank()) {
      return "";
    }
    String trimmed = value.trim();
    int spaceIndex = trimmed.indexOf(' ');
    return spaceIndex < 0 ? trimmed : trimmed.substring(0, spaceIndex);
  }

  /**
   * A job the candidate applied to outside the tracker, learned about from the application
   * confirmation email. Created straight as APPLIED with the email's date, since the email is the
   * evidence that the application happened.
   */
  @Transactional
  public JobListing createFromEmail(UUID userId, String company, String title, java.time.LocalDate appliedOn) {
    String companyName = isBlank(company) ? "Unknown company" : company.trim();
    Company companyEntity = resolveCompany(userId, companyName);

    JobListing job =
        jobListingRepository.save(
            JobListing.builder()
                .userId(userId)
                .companyId(companyEntity == null ? null : companyEntity.getId())
                .title(isBlank(title) ? "Untitled role" : title.trim())
                .company(companyName)
                .source("email")
                .ingestedBy(IngestSource.EMAIL)
                .visaSponsorship(VisaSponsorship.UNKNOWN)
                .status(JobStatus.APPLIED)
                .appliedAt(appliedOn == null ? java.time.LocalDate.now() : appliedOn)
                .parseStatus(ProcessingStatus.COMPLETED)
                .build());

    recordStatusChange(userId, job.getId(), null, job.getStatus());
    return job;
  }

  @Transactional
  public JobListing createFromDiscovery(UUID userId, DiscoveredJob discovered) {
    Company companyEntity = resolveCompany(userId, discovered.getCompany());

    ParsedJobPosting parsed = null;
    if (ai.available() && !isBlank(discovered.getDescription())) {
      try {
        parsed = ai.parseJobPosting("--- PAGE TEXT ---\n" + discovered.getTitle() + "\n" + discovered.getDescription());
      } catch (RuntimeException exception) {
        log.warn("Could not parse discovered job {}: {}", discovered.getId(), exception.getMessage());
      }
    }

    JobListing job =
        JobListing.builder()
            .userId(userId)
            .companyId(companyEntity == null ? null : companyEntity.getId())
            .externalId(boardNativeId(discovered.getExternalId()))
            .discoveredJobId(discovered.getId())
            .title(discovered.getTitle())
            .company(discovered.getCompany())
            .location(discovered.getLocation())
            .url(discovered.getUrl())
            .jobDescriptionText(discovered.getDescription())
            .postedDate(
                discovered.getPostedAt() == null
                    ? null
                    : discovered.getPostedAt().atZone(java.time.ZoneOffset.UTC).toLocalDate())
            .scrapedDate(discovered.getFirstSeenAt())
            .source("discovery")
            .ingestedBy(IngestSource.SCRAPER)
            .visaSponsorship(VisaSponsorship.UNKNOWN)
            .status(JobStatus.INTERESTED)
            .parseStatus(parsed == null ? ProcessingStatus.PENDING : ProcessingStatus.COMPLETED)
            .fitScore(discovered.getFitScore())
            .fitExplanation(discovered.getFitExplanation())
            .fitScoreSource(FitScoreSource.LIBRARY)
            .build();
    if (parsed != null) {
      job.setWorkModel(parseEnum(WorkModel.class, parsed.workModel()));
      job.setSeniorityLevel(parseEnum(SeniorityLevel.class, parsed.seniorityLevel()));
      job.setIndustry(parsed.industry());
      job.setSalaryMin(parsed.salaryMin());
      job.setSalaryMax(parsed.salaryMax());
      job.setCurrency(parsed.currency());
      job.setRequiredSkills(parsed.requiredSkills());
      job.setNiceToHaveSkills(parsed.niceToHaveSkills());
      // Only replace the discovery estimate with the full score once there are real requirements
      // to score against.
      scoreQuietly(userId, job);
    }
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
