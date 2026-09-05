package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.ResumeSection;
import com.lifeos.job_tracker.domains.entity.ResumeTailoring;
import com.lifeos.job_tracker.domains.record.SectionView;
import com.lifeos.job_tracker.domains.record.TailoredResumeSections.TailoredSection;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.ResumePdfWriter;
import com.lifeos.job_tracker.integration.ResumeSectionRenderer;
import com.lifeos.job_tracker.integration.ResumeStorageService;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ResumeTailoringRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Runs Claude tailoring against a resume variant's sections and generates a PDF for the result. */
@Service
@RequiredArgsConstructor
public class ResumeTailoringService {

  private final ResumeTailoringRepository tailoringRepository;
  private final ResumeVariantService resumeVariantService;
  private final JobListingRepository jobListingRepository;
  private final AiAssistant ai;
  private final ResumeSectionRenderer sectionRenderer;
  private final ResumePdfWriter pdfWriter;
  private final ResumeStorageService storage;
  private final JobEventProducer eventProducer;

  @Transactional
  public ResumeTailoring tailorForJob(
      UUID userId, UUID variantId, UUID jobListingId, String customInstructions, UUID applicationId) {
    if (!ai.available()) {
      throw new InvalidRequestException("Resume tailoring needs Claude; set ANTHROPIC_API_KEY to enable it");
    }
    List<ResumeSection> sections = resumeVariantService.sections(userId, variantId);
    if (sections.isEmpty()) {
      throw new InvalidRequestException("This resume variant has no sections to tailor yet");
    }
    JobListing job =
        jobListingRepository
            .findByIdAndUserId(jobListingId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", jobListingId));
    if (job.getJobDescriptionText() == null || job.getJobDescriptionText().isBlank()) {
      throw new InvalidRequestException("Job listing has no description to tailor against");
    }

    List<Map<String, Object>> sectionsJson =
        sections.stream()
            .map(
                section -> {
                  Map<String, Object> map = new LinkedHashMap<>();
                  map.put("sectionType", section.getSectionType() == null ? null : section.getSectionType().name());
                  map.put("title", section.getTitle());
                  map.put("content", section.getContent());
                  return map;
                })
            .toList();

    List<TailoredSection> tailored = ai.tailorResumeSections(sectionsJson, job.getJobDescriptionText(), customInstructions);
    List<Map<String, Object>> tailoredContent =
        tailored.stream()
            .map(
                section -> {
                  Map<String, Object> map = new LinkedHashMap<>();
                  map.put("sectionType", section.sectionType());
                  map.put("title", section.title());
                  map.put("content", section.content());
                  return map;
                })
            .toList();

    String markdown =
        sectionRenderer.toMarkdown(
            tailored.stream()
                .map(section -> new SectionView(section.sectionType(), section.title(), section.content()))
                .toList());
    byte[] pdf = pdfWriter.fromMarkdown("# Tailored resume - " + job.getTitle() + " @ " + job.getCompany() + "\n\n" + markdown);
    String pdfKey = storage.storeBytes(userId, pdf, "pdf");

    ResumeTailoring tailoring =
        tailoringRepository.save(
            ResumeTailoring.builder()
                .userId(userId)
                .jobListingId(jobListingId)
                .applicationId(applicationId)
                .originalVariantId(variantId)
                .tailoredContent(tailoredContent)
                .tailoringPrompt(customInstructions)
                .pdfFileKey(pdfKey)
                .build());
    eventProducer.emit(
        JobEventTopics.RESUME_TAILORED,
        userId,
        Map.of("resumeTailoringId", tailoring.getId().toString(), "jobListingId", jobListingId.toString()));
    return tailoring;
  }

  @Transactional(readOnly = true)
  public ResumeTailoring get(UUID userId, UUID tailoringId) {
    return tailoringRepository
        .findByIdAndUserId(tailoringId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Resume tailoring", tailoringId));
  }

  @Transactional(readOnly = true)
  public List<ResumeTailoring> listForJob(UUID userId, UUID jobListingId) {
    return tailoringRepository.findAllByUserIdAndJobListingIdOrderByCreatedAtDesc(userId, jobListingId);
  }

  @Transactional(readOnly = true)
  public ResumeTailoring getForApplication(UUID userId, UUID applicationId) {
    return tailoringRepository
        .findFirstByUserIdAndApplicationIdOrderByCreatedAtDesc(userId, applicationId)
        .orElseThrow(() -> ResourceNotFoundException.of("Resume tailoring for application", applicationId));
  }

  @Transactional(readOnly = true)
  public byte[] downloadPdf(UUID userId, UUID tailoringId) {
    ResumeTailoring tailoring = get(userId, tailoringId);
    if (tailoring.getPdfFileKey() == null) {
      throw new ResourceNotFoundException("No PDF was generated for this tailoring");
    }
    return storage.read(tailoring.getPdfFileKey());
  }
}
