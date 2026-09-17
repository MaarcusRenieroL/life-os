package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpdateJobDetailsRequest;
import com.lifeos.job_tracker.domains.entity.Company;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.JobStatusHistory;
import com.lifeos.job_tracker.domains.entity.JobTailoringVersion;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.FitScoreSource;
import com.lifeos.job_tracker.domains.enums.IngestSource;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.TailoringBase;
import com.lifeos.job_tracker.domains.enums.VisaSponsorship;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.domains.record.ExtractedSkill;
import com.lifeos.job_tracker.domains.record.ParsedJobPosting;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.domains.record.ResumeTailoringResult;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.JobLinkUnreadableException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.JobLinkFetcher;
import com.lifeos.job_tracker.integration.LatexCompiler;
import com.lifeos.job_tracker.integration.PdfTextExtractor;
import com.lifeos.job_tracker.repository.CompanyRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.JobStatusHistoryRepository;
import com.lifeos.job_tracker.repository.JobTailoringVersionRepository;
import com.lifeos.job_tracker.service.JobMatchingService.JobFitResult;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class JobListingService {

  private static final Logger log = LoggerFactory.getLogger(JobListingService.class);

  private final JobListingRepository jobListingRepository;
  private final CompanyRepository companyRepository;
  private final AiAssistant ai;
  private final JobMatchingService jobMatchingService;
  private final JobLinkFetcher jobLinkFetcher;
  private final CareerProfileService careerProfileService;
  private final LatexCompiler latexCompiler;
  private final PdfTextExtractor pdfTextExtractor;
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

  /** Drafts a cover letter for this job from whichever resume currently represents the candidate
   * for it - the job-specific override upload if one exists, otherwise the global saved resume -
   * same "never invent experience" constraint as tailorResume, and the same one-shot-overwrite
   * model tailoring had before versioning (no history yet; add it if this turns out to need
   * re-drafting often). */
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
   * an uploaded override beats this job's own AI-tailored resume, which beats the candidate's
   * whole persisted skill library - and scores against that, so the candidate never has to know
   * or remember which of three buttons to press.
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
    } else if (job.getTailoredLatexResume() != null && !job.getTailoredLatexResume().isBlank()) {
      result = jobMatchingService.score(job, resolveTailoredSkills(userId, job));
      source = FitScoreSource.TAILORED_RESUME;
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

  private List<Skill> resolveTailoredSkills(UUID userId, JobListing job) {
    if (job.getTailoredResumeSkills() == null) {
      List<ExtractedSkill> parsed = safeParseSkills(extractPlainText(job.getTailoredLatexResume()));
      job.setTailoredResumeSkills(parsed);
    }
    return skillService.toTransientSkills(job.getTailoredResumeSkills());
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

  /** The resume text {@link #tailorResume} and {@link #generateCoverLetter} should build from -
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
   * the candidate wants to check without touching their persisted skill library or this job's own
   * AI-tailored resume. Replaces any previous override for this job.
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
   * one, otherwise the global saved resume) against the job's real requirements, then asks Claude
   * for concrete resume-improvement points and a full LaTeX resume tailored to it, ready to paste
   * into Overleaf.
   */
  @Transactional
  public ResumeTailoringResult tailorResume(UUID userId, UUID jobId) {
    JobListing job = get(userId, jobId);
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      throw new InvalidRequestException("This job has no description text to tailor a resume against");
    }

    boolean hasOverride = job.getOverrideResumeText() != null && !job.getOverrideResumeText().isBlank();
    TailoringBase basedOn = hasOverride ? TailoringBase.OVERRIDE_RESUME : TailoringBase.GLOBAL_RESUME;
    String baseResumeText = resolveBaseResumeText(userId, job);
    if (baseResumeText == null || baseResumeText.isBlank()) {
      throw new InvalidRequestException("Upload a resume with readable text before tailoring it");
    }

    if (!ai.claudeAvailable()) {
      throw new InvalidRequestException(
          "Tailoring a resume needs Claude; set ANTHROPIC_API_KEY to enable it");
    }

    // Gap analysis has to be computed against the SAME resume being tailored - scoring against the
    // global library while tailoring an override resume would tell Claude to "fix" gaps the
    // override resume doesn't actually have (or hide ones it does).
    List<Skill> baseSkills = hasOverride ? resolveOverrideSkills(userId, job) : null;
    JobFitResult fit = hasOverride ? jobMatchingService.score(job, baseSkills) : jobMatchingService.score(userId, job);
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
            baseResumeText);

    // The prompt already asks for one page and no em/en dashes, but LLM instruction-following
    // isn't guaranteed - actually compile it and scan the text, and if either is wrong, retry
    // ONCE with a combined correction instruction rather than silently handing back a bad resume
    // or burning a second full API call per problem.
    byte[] pdf = latexCompiler.compile(result.latexResume());
    boolean overflowed = latexCompiler.pageCount(pdf) > 1;
    boolean hasTypographicDash = containsTypographicDash(result.latexResume());
    if (overflowed || hasTypographicDash) {
      StringBuilder correction = new StringBuilder();
      if (overflowed) {
        correction
            .append("The previous attempt ran onto a second page. Cut content - shorten bullets")
            .append(" and drop the least-relevant ones - so it fits on exactly one page. ");
      }
      if (hasTypographicDash) {
        correction
            .append("The previous attempt used an em dash or en dash character somewhere. Rewrite")
            .append(" it with a comma, period, colon, parentheses, or the word \"to\" instead, per")
            .append(" the no-dash rule.");
      }
      ResumeTailoringResult retry =
          ai.tailorResume(
              job.getTitle(),
              job.getCompany(),
              job.getJobDescriptionText(),
              job.getRequiredSkills(),
              missingSkills,
              partialSkills,
              baseResumeText,
              correction.toString());
      byte[] retryPdf = latexCompiler.compile(retry.latexResume());
      if (latexCompiler.pageCount(retryPdf) <= latexCompiler.pageCount(pdf)) {
        result = retry;
      }
      // One retry is the budget (matches the credit-conscious page-overflow retry this was
      // already doing) - if a dash still slipped through after that, log it rather than looping
      // again, since a human glancing at the PDF will catch a stray dash in seconds anyway.
      if (hasTypographicDash && containsTypographicDash(result.latexResume())) {
        log.warn("Tailored resume for job {} still contains an em/en dash after one retry", job.getId());
      }
    }

    // The prompt explicitly forbids constructing a URL that isn't literally in the profile, but
    // that instruction alone didn't hold up in practice (observed Claude build a plausible
    // github.com/<user>/<project> URL from the candidate's real username plus a project name,
    // for a project with no link on file) - checked programmatically instead of trusted, since a
    // fabricated link in a resume that gets submitted to an employer is a real credibility risk.
    String finalLatex = stripFabricatedLinks(result.latexResume(), baseResumeText);
    result = new ResumeTailoringResult(
        result.improvementPoints(), result.gapsVsJd(), result.inferredClaims(), finalLatex);

    job.setTailoredImprovementPoints(result.improvementPoints());
    job.setTailoredGapsVsJd(result.gapsVsJd());
    job.setTailoredInferredClaims(result.inferredClaims());
    job.setTailoredLatexResume(result.latexResume());

    // Parse the tailored output once, cache it for future rescores, and only merge it into the
    // permanent skill library when it was built from the candidate's own trusted global resume -
    // an override resume is by definition an external/unverified artifact (the whole point of
    // uploading one is to check it before trusting it), so tailoring from it must not silently
    // contaminate the library with skills that resume claims but the candidate never confirmed.
    List<ExtractedSkill> tailoredSkills = safeParseSkills(extractPlainText(result.latexResume()));
    job.setTailoredResumeSkills(tailoredSkills);
    if (basedOn == TailoringBase.GLOBAL_RESUME) {
      skillService.mergeExtracted(userId, tailoredSkills);
    }

    jobListingRepository.save(job);
    JobFitResult rescored = recomputeFitScore(userId, job);
    saveVersion(userId, job, result, rescored.score(), basedOn);

    return result;
  }

  /** Skill extraction needs plain, human-readable text - raw LaTeX source (commands, braces,
   * \hfill, section markers) is noise the resume-parse prompt wasn't designed for, and a small
   * local model asked to parse it around that noise gives inconsistent results run to run
   * (missing skills that are plainly present in the rendered resume). Compiling and stripping the
   * PDF gives it exactly what a human reader would see, same as an uploaded resume. */
  private String extractPlainText(String latexSource) {
    try {
      return pdfTextExtractor.extract(latexCompiler.compile(latexSource));
    } catch (RuntimeException exception) {
      log.warn("Could not render tailored LaTeX to extract plain text, falling back to raw source: {}", exception.getMessage());
      return latexSource;
    }
  }

  /** The tailoring prompt explicitly forbids em dashes (—) and en dashes (–), but a
   * model can still slip one in - checked directly against the LaTeX source rather than trusting
   * the model's own compliance. */
  private static boolean containsTypographicDash(String latex) {
    return latex != null && (latex.indexOf('–') >= 0 || latex.indexOf('—') >= 0);
  }

  private static final java.util.regex.Pattern HREF =
      java.util.regex.Pattern.compile("\\\\href\\{([^}]*)\\}\\{([^}]*)\\}");

  /** Drops the hyperlink wrapper (keeping the visible text) around any \href whose URL doesn't
   * appear verbatim in the source profile - a link a model constructed rather than copied,
   * however plausible-looking, is not a fact about the candidate. */
  private static String stripFabricatedLinks(String latex, String sourceText) {
    if (latex == null || sourceText == null) {
      return latex;
    }
    java.util.regex.Matcher matcher = HREF.matcher(latex);
    StringBuilder result = new StringBuilder();
    while (matcher.find()) {
      String url = matcher.group(1);
      String text = matcher.group(2);
      // The profile stores links without a protocol ("github.com/user"); Claude's LaTeX adds
      // "https://" - strip it from both sides before comparing so a real link isn't mistaken
      // for a fabricated one over a prefix mismatch.
      String normalisedUrl = url.replaceFirst("^https?://", "");
      boolean realLink = normalisedUrl.length() > 3 && sourceText.contains(normalisedUrl);
      matcher.appendReplacement(
          result, java.util.regex.Matcher.quoteReplacement(realLink ? matcher.group() : text));
    }
    matcher.appendTail(result);
    return result.toString();
  }

  private void saveVersion(
      UUID userId, JobListing job, ResumeTailoringResult result, int fitScore, TailoringBase basedOn) {
    int nextVersion = jobTailoringVersionRepository.countByJobId(job.getId()) + 1;
    jobTailoringVersionRepository.save(
        JobTailoringVersion.builder()
            .jobId(job.getId())
            .userId(userId)
            .version(nextVersion)
            .improvementPoints(result.improvementPoints())
            .gapsVsJd(result.gapsVsJd())
            .inferredClaims(result.inferredClaims())
            .latexResume(result.latexResume())
            .fitScore(fitScore)
            .basedOn(basedOn)
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
