package com.lifeos.job_tracker.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.entity.Resume;
import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.PdfTextExtractor;
import com.lifeos.job_tracker.integration.ResumeStorageService;
import com.lifeos.job_tracker.repository.ResumeRepository;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * The candidate keeps a single resume. Uploading a new one replaces the old. The resume's extracted
 * skills feed job fit scoring.
 */
@Service
@RequiredArgsConstructor
public class ResumeService {

  private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

  private final ResumeRepository resumeRepository;
  private final ResumeStorageService storage;
  private final PdfTextExtractor pdfTextExtractor;
  private final AiAssistant ai;
  private final SkillService skillService;
  private final ObjectMapper objectMapper;

  public record ResumeDownload(String fileName, String contentType, byte[] content) {}

  @Transactional(readOnly = true)
  public Resume getCurrent(UUID userId) {
    return resumeRepository
        .findFirstByUserIdOrderByCreatedAtDesc(userId)
        .orElseThrow(() -> new ResourceNotFoundException("No resume uploaded yet"));
  }

  @Transactional(readOnly = true)
  public Resume get(UUID userId, UUID resumeId) {
    return resumeRepository
        .findByIdAndUserId(resumeId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Resume", resumeId));
  }

  /**
   * Stores the PDF (replacing any previous one), extracts its text, then - if Claude is configured
   * - parses it and merges the discovered skills. A parse failure leaves the resume FAILED rather
   * than rejecting the upload.
   */
  @Transactional
  public Resume upload(UUID userId, MultipartFile file, String label) {
    if (file == null || file.isEmpty()) {
      throw new InvalidRequestException("No file was uploaded");
    }

    String fileKey = storage.store(userId, file);
    byte[] bytes = storage.read(fileKey);

    boolean looksLikePdf =
        bytes.length >= 4 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F';
    boolean namedPdf =
        file.getOriginalFilename() != null
            && file.getOriginalFilename().toLowerCase().endsWith(".pdf");
    if (!looksLikePdf && !namedPdf) {
      storage.delete(fileKey);
      throw new InvalidRequestException("Only PDF resumes are supported");
    }

    // Replace whatever resume was there before.
    for (Resume old : resumeRepository.findAllByUserId(userId)) {
      storage.delete(old.getFileKey());
      resumeRepository.delete(old);
    }

    String rawText = null;
    String extractionError = null;
    try {
      rawText = pdfTextExtractor.extract(bytes);
    } catch (RuntimeException exception) {
      extractionError = exception.getMessage();
      log.warn("PDF text extraction failed for {}: {}", file.getOriginalFilename(), exception.getMessage());
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
                .base(true)
                .build());

    if (extractionError != null) {
      resume.setExtractionStatus(ProcessingStatus.FAILED);
      resume.setExtractionError("Could not read text from this PDF (" + extractionError + ").");
      return resumeRepository.save(resume);
    }
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
