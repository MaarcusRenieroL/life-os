package com.lifeos.job_tracker.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Resume;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.LatexCompiler;
import com.lifeos.job_tracker.integration.PdfTextExtractor;
import com.lifeos.job_tracker.integration.ResumePdfWriter;
import com.lifeos.job_tracker.integration.ResumeStorageService;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ResumeRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ResumeService {

  private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

  private final ResumeRepository resumeRepository;
  private final JobListingRepository jobListingRepository;
  private final ResumeStorageService storage;
  private final PdfTextExtractor pdfTextExtractor;
  private final ResumePdfWriter pdfWriter;
  private final LatexCompiler latexCompiler;
  private final AiAssistant ai;
  private final SkillService skillService;
  private final ResumeVariantService resumeVariantService;
  private final ObjectMapper objectMapper;

  public record TailoredResume(Resume resume, String markdown, String latex) {}

  public record ResumeDownload(String fileName, String contentType, byte[] content) {}

  @Transactional(readOnly = true)
  public List<Resume> list(UUID userId) {
    return resumeRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
  }

  @Transactional(readOnly = true)
  public Resume get(UUID userId, UUID resumeId) {
    return resumeRepository
        .findByIdAndUserId(resumeId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Resume", resumeId));
  }

  /**
   * Stores the PDF, extracts its text, then (if Claude is configured) parses it into structured
   * data and merges the discovered skills. A Claude failure leaves the resume in FAILED rather than
   * rejecting the upload.
   */
  @Transactional
  public Resume upload(UUID userId, MultipartFile file, String label, boolean base) {
    if (file == null || file.isEmpty()) {
      throw new InvalidRequestException("No file was uploaded");
    }

    String fileKey = storage.store(userId, file);
    byte[] bytes = storage.read(fileKey);

    // Validate by the actual bytes, not the browser-supplied content type -
    // browsers on some systems send a valid PDF as application/octet-stream.
    boolean looksLikePdf =
        bytes.length >= 4 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F';
    boolean namedPdf =
        file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase().endsWith(".pdf");
    if (!looksLikePdf && !namedPdf) {
      storage.delete(fileKey);
      throw new InvalidRequestException("Only PDF resumes are supported");
    }

    // Text extraction failing (image-only/scanned resume, an encrypted PDF, odd
    // font encoding PDFBox can't map) must NOT reject the upload - the PDF is
    // the thing worth keeping. Store it, mark extraction FAILED, move on.
    String rawText = null;
    String extractionError = null;
    try {
      rawText = pdfTextExtractor.extract(bytes);
    } catch (RuntimeException exception) {
      extractionError = exception.getMessage();
      log.warn("PDF text extraction failed for {}: {}", file.getOriginalFilename(), exception.getMessage());
    }

    if (base) {
      resumeRepository
          .findFirstByUserIdAndBaseIsTrueOrderByCreatedAtDesc(userId)
          .ifPresent(
              previous -> {
                previous.setBase(false);
                resumeRepository.save(previous);
              });
    }

    Resume resume =
        resumeRepository.save(
            Resume.builder()
                .userId(userId)
                .label(label)
                .fileKey(fileKey)
                .fileName(file.getOriginalFilename() == null ? "resume.pdf" : file.getOriginalFilename())
                .fileSize(file.getSize())
                .contentType("application/pdf")
                .extractionStatus(ProcessingStatus.PENDING)
                .rawText(rawText)
                .base(base)
                .build());

    if (extractionError != null) {
      resume.setExtractionStatus(ProcessingStatus.FAILED);
      resume.setExtractionError("Could not read text from this PDF (" + extractionError + "). File stored; add sections manually in Resume Builder.");
      return resumeRepository.save(resume);
    }

    if (!ai.available()) {
      resume.setExtractionStatus(ProcessingStatus.FAILED);
      resume.setExtractionError("Anthropic API key not configured; stored raw text only");
      return resumeRepository.save(resume);
    }

    ParsedResume parsed = null;
    try {
      resume.setExtractionStatus(ProcessingStatus.PROCESSING);
      parsed = ai.parseResume(rawText);
      resume.setParsedJson(objectMapper.convertValue(parsed, new TypeReference<Map<String, Object>>() {}));
      resume.setExtractionStatus(ProcessingStatus.COMPLETED);
      skillService.mergeExtracted(userId, parsed.skills());
    } catch (RuntimeException exception) {
      log.warn("resume {} extraction failed: {}", resume.getId(), exception.getMessage());
      resume.setExtractionStatus(ProcessingStatus.FAILED);
      resume.setExtractionError(exception.getMessage());
    }

    Resume saved = resumeRepository.save(resume);

    if (parsed != null) {
      try {
        resumeVariantService.createFromParsedResume(userId, saved, parsed);
      } catch (RuntimeException exception) {
        log.warn("failed to create resume variant for resume {}: {}", saved.getId(), exception.getMessage());
      }
    }

    return saved;
  }

  @Transactional
  public TailoredResume tailor(UUID userId, UUID resumeId, UUID jobListingId, String instruction) {
    if (!ai.available()) {
      throw new InvalidRequestException(
          "Resume tailoring needs Claude; set ANTHROPIC_API_KEY to enable it");
    }
    Resume base = get(userId, resumeId);
    boolean hasLatex = base.getLatexSource() != null && !base.getLatexSource().isBlank();
    if (!hasLatex && (base.getRawText() == null || base.getRawText().isBlank())) {
      throw new InvalidRequestException("Base resume has no extracted text to tailor from");
    }

    JobListing job =
        jobListingRepository
            .findByIdAndUserId(jobListingId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", jobListingId));
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      throw new InvalidRequestException("Job listing has no description to tailor against");
    }

    String markdown;
    String latex = null;
    byte[] pdf;
    if (hasLatex) {
      // Re-render on the candidate's own template: Claude rewrites the content inside the
      // LaTeX, tectonic compiles it back to a pixel-identical PDF. If it overflows one page,
      // ask once more with a hard "cut it down" instruction.
      latex =
          stripCodeFences(
              ai.tailorLatexResume(
                  base.getLatexSource(), job.getJobDescriptionText(), instruction));
      pdf = latexCompiler.compile(latex);
      if (latexCompiler.pageCount(pdf) > 1) {
        String tighten =
            (instruction == null || instruction.isBlank() ? "" : instruction + " ")
                + "The previous attempt ran onto a second page. Cut content - shorten bullets and"
                + " drop the least-relevant ones - so it fits on exactly one page.";
        String retry =
            stripCodeFences(
                ai.tailorLatexResume(base.getLatexSource(), job.getJobDescriptionText(), tighten));
        byte[] retryPdf = latexCompiler.compile(retry);
        if (latexCompiler.pageCount(retryPdf) <= latexCompiler.pageCount(pdf)) {
          latex = retry;
          pdf = retryPdf;
        }
      }
      markdown = latex;
    } else {
      markdown =
          ai.generateTailoredResume(base.getRawText(), job.getJobDescriptionText(), instruction);
      pdf = pdfWriter.fromMarkdown(markdown);
    }

    String key = storage.storeBytes(userId, pdf, "pdf");
    Resume tailored =
        resumeRepository.save(
            Resume.builder()
                .userId(userId)
                .label("Tailored for " + job.getTitle() + " @ " + job.getCompany())
                .fileKey(key)
                .fileName("resume-" + jobListingId + ".pdf")
                .fileSize(pdf.length)
                .contentType("application/pdf")
                .extractionStatus(ProcessingStatus.COMPLETED)
                .rawText(markdown)
                .latexSource(latex)
                .sourceInstruction(instruction)
                .base(false)
                .build());

    return new TailoredResume(tailored, markdown, latex);
  }

  /** Saves (or clears, when {@code source} is blank) the LaTeX template on a base resume. */
  @Transactional
  public Resume saveLatexSource(UUID userId, UUID resumeId, String source) {
    Resume resume = get(userId, resumeId);
    String trimmed = source == null ? null : source.strip();
    if (trimmed != null && !trimmed.isBlank() && !trimmed.contains("\\documentclass")) {
      throw new InvalidRequestException(
          "That doesn't look like a LaTeX document (no \\documentclass)");
    }
    resume.setLatexSource(trimmed == null || trimmed.isBlank() ? null : trimmed);
    return resumeRepository.save(resume);
  }

  private static String stripCodeFences(String text) {
    String s = text.strip();
    if (s.startsWith("```")) {
      int firstNl = s.indexOf('\n');
      int lastFence = s.lastIndexOf("```");
      if (firstNl > 0 && lastFence > firstNl) {
        s = s.substring(firstNl + 1, lastFence).strip();
      }
    }
    return s;
  }

  @Transactional(readOnly = true)
  public ResumeDownload download(UUID userId, UUID resumeId) {
    Resume resume = get(userId, resumeId);
    return new ResumeDownload(
        resume.getFileName(), resume.getContentType(), storage.read(resume.getFileKey()));
  }

  @Transactional
  public void delete(UUID userId, UUID resumeId) {
    Resume resume = get(userId, resumeId);
    storage.delete(resume.getFileKey());
    resumeRepository.delete(resume);
  }
}
