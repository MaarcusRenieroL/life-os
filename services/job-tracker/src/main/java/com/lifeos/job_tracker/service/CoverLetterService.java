package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.GenerateCoverLetterRequest;
import com.lifeos.job_tracker.domains.entity.Application;
import com.lifeos.job_tracker.domains.entity.CoverLetter;
import com.lifeos.job_tracker.domains.entity.CoverLetterTemplate;
import com.lifeos.job_tracker.domains.entity.CoverLetterVersion;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.ResumeSection;
import com.lifeos.job_tracker.domains.entity.ResumeVariant;
import com.lifeos.job_tracker.domains.enums.CoverLetterStyle;
import com.lifeos.job_tracker.domains.enums.CoverLetterTone;
import com.lifeos.job_tracker.domains.record.SectionView;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.ResumePdfWriter;
import com.lifeos.job_tracker.integration.ResumeSectionRenderer;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.ApplicationRepository;
import com.lifeos.job_tracker.repository.CoverLetterRepository;
import com.lifeos.job_tracker.repository.CoverLetterTemplateRepository;
import com.lifeos.job_tracker.repository.CoverLetterVersionRepository;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ResumeVariantRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CoverLetterService {

  private final CoverLetterRepository coverLetterRepository;
  private final CoverLetterVersionRepository versionRepository;
  private final CoverLetterTemplateRepository templateRepository;
  private final ApplicationRepository applicationRepository;
  private final JobListingRepository jobListingRepository;
  private final ResumeVariantRepository resumeVariantRepository;
  private final ResumeVariantService resumeVariantService;
  private final AiAssistant ai;
  private final ResumeSectionRenderer sectionRenderer;
  private final ResumePdfWriter pdfWriter;
  private final JobEventProducer eventProducer;
  private final ObjectMapper objectMapper;

  @Transactional
  public CoverLetter generate(UUID userId, UUID applicationId, GenerateCoverLetterRequest request) {
    if (!ai.available()) {
      throw new InvalidRequestException("Cover letter generation needs Claude; set ANTHROPIC_API_KEY to enable it");
    }
    Application application = requireApplication(userId, applicationId);
    JobListing job =
        jobListingRepository
            .findByIdAndUserId(application.getJobListingId(), userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", application.getJobListingId()));

    UUID resumeVariantId = request.resumeVariantId();
    ResumeVariant variant =
        resumeVariantId != null
            ? resumeVariantService.get(userId, resumeVariantId)
            : resumeVariantRepository.findFirstByUserIdAndBaseIsTrueOrderByCreatedAtDesc(userId).orElse(null);
    String resumeSummary = variant == null ? "(no resume on file)" : renderResumeSummary(userId, variant.getId());

    CoverLetterTone tone = request.tone() == null ? CoverLetterTone.PROFESSIONAL : request.tone();
    CoverLetterStyle style = request.style() == null ? CoverLetterStyle.TRADITIONAL : request.style();
    String templateStructure = null;
    String templateName = null;
    if (request.templateId() != null) {
      CoverLetterTemplate template =
          templateRepository
              .findAllByUserIdIsNullOrUserId(userId)
              .stream()
              .filter(t -> t.getId().equals(request.templateId()))
              .findFirst()
              .orElseThrow(() -> ResourceNotFoundException.of("Cover letter template", request.templateId()));
      templateStructure = toJson(template.getContentStructure());
      templateName = template.getName();
      tone = template.getTone() != null ? template.getTone() : tone;
      style = template.getStyle() != null ? template.getStyle() : style;
    }
    if (request.customInstructions() != null && !request.customInstructions().isBlank()) {
      templateStructure =
          (templateStructure == null ? "" : templateStructure + " ")
              + "Additional instruction: " + request.customInstructions();
    }

    String content =
        ai.generateCoverLetter(
            job.getTitle(), job.getCompany(), job.getJobDescriptionText(), resumeSummary, tone.name(), style.name(), templateStructure);

    CoverLetter coverLetter =
        coverLetterRepository.findByApplicationIdAndUserId(applicationId, userId).orElse(null);
    if (coverLetter == null) {
      coverLetter =
          CoverLetter.builder()
              .userId(userId)
              .applicationId(applicationId)
              .jobListingId(job.getId())
              .resumeVariantId(variant == null ? null : variant.getId())
              .generatedContent(content)
              .customEdits(content)
              .tone(tone)
              .style(style)
              .templateUsed(templateName)
              .version(1)
              .build();
    } else {
      archiveCurrentVersion(coverLetter);
      coverLetter.setGeneratedContent(content);
      coverLetter.setCustomEdits(content);
      coverLetter.setTone(tone);
      coverLetter.setStyle(style);
      coverLetter.setTemplateUsed(templateName);
      coverLetter.setCustomized(false);
      coverLetter.setVersion(coverLetter.getVersion() + 1);
    }
    CoverLetter saved = coverLetterRepository.save(coverLetter);
    eventProducer.emit(
        JobEventTopics.COVER_LETTER_GENERATED,
        userId,
        Map.of("coverLetterId", saved.getId().toString(), "applicationId", applicationId.toString()));
    return saved;
  }

  @Transactional(readOnly = true)
  public CoverLetter get(UUID userId, UUID coverLetterId) {
    return require(userId, coverLetterId);
  }

  @Transactional(readOnly = true)
  public CoverLetter getForApplication(UUID userId, UUID applicationId) {
    return coverLetterRepository
        .findByApplicationIdAndUserId(applicationId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("No cover letter generated yet for this application"));
  }

  @Transactional
  public CoverLetter update(UUID userId, UUID coverLetterId, String generatedContent) {
    CoverLetter coverLetter = require(userId, coverLetterId);
    archiveCurrentVersion(coverLetter);
    coverLetter.setGeneratedContent(generatedContent);
    coverLetter.setCustomized(true);
    coverLetter.setVersion(coverLetter.getVersion() + 1);
    CoverLetter saved = coverLetterRepository.save(coverLetter);
    eventProducer.emit(JobEventTopics.COVER_LETTER_CUSTOMIZED, userId, Map.of("coverLetterId", saved.getId().toString()));
    return saved;
  }

  @Transactional
  public void delete(UUID userId, UUID coverLetterId) {
    coverLetterRepository.delete(require(userId, coverLetterId));
  }

  @Transactional
  public CoverLetter revertToGenerated(UUID userId, UUID coverLetterId) {
    CoverLetter coverLetter = require(userId, coverLetterId);
    archiveCurrentVersion(coverLetter);
    coverLetter.setGeneratedContent(coverLetter.getCustomEdits());
    coverLetter.setCustomized(false);
    coverLetter.setVersion(coverLetter.getVersion() + 1);
    return coverLetterRepository.save(coverLetter);
  }

  @Transactional(readOnly = true)
  public List<CoverLetterVersion> versions(UUID userId, UUID coverLetterId) {
    require(userId, coverLetterId);
    return versionRepository.findAllByCoverLetterIdOrderByVersionDesc(coverLetterId);
  }

  @Transactional(readOnly = true)
  public CoverLetterVersion version(UUID userId, UUID coverLetterId, int version) {
    require(userId, coverLetterId);
    return versionRepository
        .findByCoverLetterIdAndVersion(coverLetterId, version)
        .orElseThrow(() -> new ResourceNotFoundException("Cover letter version " + version + " not found"));
  }

  @Transactional(readOnly = true)
  public byte[] downloadPdf(UUID userId, UUID coverLetterId) {
    CoverLetter coverLetter = require(userId, coverLetterId);
    return pdfWriter.fromMarkdown(coverLetter.getGeneratedContent());
  }

  private void archiveCurrentVersion(CoverLetter coverLetter) {
    versionRepository.save(
        CoverLetterVersion.builder()
            .coverLetterId(coverLetter.getId())
            .version(coverLetter.getVersion())
            .content(coverLetter.getGeneratedContent())
            .build());
  }

  private String renderResumeSummary(UUID userId, UUID variantId) {
    List<ResumeSection> sections = resumeVariantService.sections(userId, variantId);
    return sectionRenderer.toMarkdown(
        sections.stream()
            .map(
                section ->
                    new SectionView(
                        section.getSectionType() == null ? null : section.getSectionType().name(),
                        section.getTitle(),
                        section.getContent()))
            .toList());
  }

  private String toJson(Object value) {
    if (value == null) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception exception) {
      return null;
    }
  }

  private CoverLetter require(UUID userId, UUID coverLetterId) {
    return coverLetterRepository
        .findByIdAndUserId(coverLetterId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Cover letter", coverLetterId));
  }

  private Application requireApplication(UUID userId, UUID applicationId) {
    return applicationRepository
        .findByIdAndUserId(applicationId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Application", applicationId));
  }
}
