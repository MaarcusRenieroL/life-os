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
  private final AiAssistant ai;
  private final SkillService skillService;
  private final ObjectMapper objectMapper;

  public record TailoredResume(Resume resume, String markdown) {}

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
    String contentType = file.getContentType();
    if (contentType != null && !contentType.contains("pdf")) {
      throw new InvalidRequestException("Only PDF resumes are supported");
    }

    String fileKey = storage.store(userId, file);
    byte[] bytes = storage.read(fileKey);
    String rawText = pdfTextExtractor.extract(bytes);

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

    if (!ai.available()) {
      resume.setExtractionStatus(ProcessingStatus.FAILED);
      resume.setExtractionError("Anthropic API key not configured; stored raw text only");
      return resumeRepository.save(resume);
    }

    try {
      resume.setExtractionStatus(ProcessingStatus.PROCESSING);
      ParsedResume parsed = ai.parseResume(rawText);
      resume.setParsedJson(objectMapper.convertValue(parsed, new TypeReference<Map<String, Object>>() {}));
      resume.setExtractionStatus(ProcessingStatus.COMPLETED);
      skillService.mergeExtracted(userId, parsed.skills());
    } catch (RuntimeException exception) {
      log.warn("resume {} extraction failed: {}", resume.getId(), exception.getMessage());
      resume.setExtractionStatus(ProcessingStatus.FAILED);
      resume.setExtractionError(exception.getMessage());
    }

    return resumeRepository.save(resume);
  }

  @Transactional
  public TailoredResume tailor(UUID userId, UUID resumeId, UUID jobListingId, String instruction) {
    Resume base = get(userId, resumeId);
    if (base.getRawText() == null || base.getRawText().isBlank()) {
      throw new InvalidRequestException("Base resume has no extracted text to tailor from");
    }

    JobListing job =
        jobListingRepository
            .findByIdAndUserId(jobListingId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", jobListingId));
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      throw new InvalidRequestException("Job listing has no description to tailor against");
    }

    String markdown =
        ai.generateTailoredResume(base.getRawText(), job.getJobDescriptionText(), instruction);
    byte[] pdf = pdfWriter.fromMarkdown(markdown);

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
                .sourceInstruction(instruction)
                .base(false)
                .build());

    return new TailoredResume(tailored, markdown);
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
