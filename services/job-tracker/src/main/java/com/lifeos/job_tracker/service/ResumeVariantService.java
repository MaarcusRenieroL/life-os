package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.CreateResumeVariantRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateResumeVariantRequest;
import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.entity.Resume;
import com.lifeos.job_tracker.domains.entity.ResumeSection;
import com.lifeos.job_tracker.domains.entity.ResumeVariant;
import com.lifeos.job_tracker.domains.enums.ResumeVisibility;
import com.lifeos.job_tracker.domains.enums.SectionType;
import com.lifeos.job_tracker.domains.enums.StylingTemplate;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.JobListingRepository;
import com.lifeos.job_tracker.repository.ResumeSectionRepository;
import com.lifeos.job_tracker.repository.ResumeVariantRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ResumeVariantService {

  private final ResumeVariantRepository variantRepository;
  private final ResumeSectionRepository sectionRepository;
  private final JobListingRepository jobListingRepository;
  private final JobEventProducer eventProducer;

  @Transactional(readOnly = true)
  public List<ResumeVariant> list(UUID userId) {
    return variantRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
  }

  @Transactional(readOnly = true)
  public ResumeVariant get(UUID userId, UUID variantId) {
    return variantRepository
        .findByIdAndUserId(variantId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Resume variant", variantId));
  }

  @Transactional(readOnly = true)
  public List<ResumeSection> sections(UUID userId, UUID variantId) {
    get(userId, variantId);
    return sectionRepository.findAllByResumeVariantIdOrderBySortOrderAsc(variantId);
  }

  @Transactional
  public ResumeVariant create(UUID userId, CreateResumeVariantRequest request) {
    if (variantRepository.existsByUserIdAndName(userId, request.name())) {
      throw new InvalidRequestException("A resume variant named '" + request.name() + "' already exists");
    }
    ResumeVariant variant =
        variantRepository.save(
            ResumeVariant.builder()
                .userId(userId)
                .name(request.name())
                .description(request.description())
                .visibility(ResumeVisibility.PRIVATE)
                .stylingTemplate(StylingTemplate.MODERN)
                .fontFamily("Calibri")
                .accentColor("#0066cc")
                .build());

    if (request.baseVariantId() != null) {
      cloneSectionsInto(userId, request.baseVariantId(), variant.getId());
    }
    emitCreated(userId, variant);
    return variant;
  }

  @Transactional
  public ResumeVariant update(UUID userId, UUID variantId, UpdateResumeVariantRequest request) {
    ResumeVariant variant = get(userId, variantId);

    if (request.name() != null) {
      variant.setName(request.name());
    }
    if (request.description() != null) {
      variant.setDescription(request.description());
    }
    if (request.isPublic() != null) {
      variant.setPublic(request.isPublic());
    }
    if (request.visibility() != null) {
      variant.setVisibility(request.visibility());
    }
    if (request.stylingTemplate() != null) {
      variant.setStylingTemplate(request.stylingTemplate());
    }
    if (request.fontFamily() != null) {
      variant.setFontFamily(request.fontFamily());
    }
    if (request.accentColor() != null) {
      variant.setAccentColor(request.accentColor());
    }
    if (request.sectionOrder() != null) {
      variant.setSectionOrder(request.sectionOrder());
    }
    if (Boolean.TRUE.equals(request.isBase())) {
      variantRepository
          .findFirstByUserIdAndBaseIsTrueOrderByCreatedAtDesc(userId)
          .filter(previous -> !previous.getId().equals(variantId))
          .ifPresent(
              previous -> {
                previous.setBase(false);
                variantRepository.save(previous);
              });
      variant.setBase(true);
    } else if (Boolean.FALSE.equals(request.isBase())) {
      variant.setBase(false);
    }
    return variantRepository.save(variant);
  }

  @Transactional
  public void delete(UUID userId, UUID variantId) {
    ResumeVariant variant = get(userId, variantId);
    if (variant.isBase()) {
      throw new InvalidRequestException("Cannot delete the base resume variant - mark another one as base first");
    }
    variantRepository.delete(variant);
  }

  @Transactional
  public ResumeVariant clone(UUID userId, UUID variantId, String newName) {
    ResumeVariant source = get(userId, variantId);
    if (variantRepository.existsByUserIdAndName(userId, newName)) {
      throw new InvalidRequestException("A resume variant named '" + newName + "' already exists");
    }
    ResumeVariant clone =
        variantRepository.save(
            ResumeVariant.builder()
                .userId(userId)
                .name(newName)
                .description(source.getDescription())
                .visibility(source.getVisibility())
                .stylingTemplate(source.getStylingTemplate())
                .fontFamily(source.getFontFamily())
                .accentColor(source.getAccentColor())
                .sectionOrder(source.getSectionOrder())
                .sourceResumeId(source.getSourceResumeId())
                .build());
    cloneSectionsInto(userId, variantId, clone.getId());
    emitCreated(userId, clone);
    return clone;
  }

  @Transactional
  public ResumeVariant duplicateForJob(UUID userId, UUID variantId, UUID jobListingId) {
    ResumeVariant source = get(userId, variantId);
    JobListing job =
        jobListingRepository
            .findByIdAndUserId(jobListingId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job listing", jobListingId));

    String baseName = source.getName() + " - " + job.getCompany();
    String candidateName = baseName;
    int suffix = 2;
    while (variantRepository.existsByUserIdAndName(userId, candidateName)) {
      candidateName = baseName + " (" + suffix++ + ")";
    }

    ResumeVariant duplicate =
        variantRepository.save(
            ResumeVariant.builder()
                .userId(userId)
                .name(candidateName)
                .description("Duplicated from \"" + source.getName() + "\" for " + job.getTitle() + " @ " + job.getCompany())
                .visibility(source.getVisibility())
                .stylingTemplate(source.getStylingTemplate())
                .fontFamily(source.getFontFamily())
                .accentColor(source.getAccentColor())
                .sectionOrder(source.getSectionOrder())
                .sourceResumeId(source.getSourceResumeId())
                .sourceJobListingId(jobListingId)
                .build());
    cloneSectionsInto(userId, variantId, duplicate.getId());
    emitCreated(userId, duplicate);
    return duplicate;
  }

  private void cloneSectionsInto(UUID userId, UUID sourceVariantId, UUID targetVariantId) {
    get(userId, sourceVariantId); // ownership check
    List<ResumeSection> sourceSections =
        sectionRepository.findAllByResumeVariantIdOrderBySortOrderAsc(sourceVariantId);
    List<ResumeSection> clones =
        sourceSections.stream()
            .map(
                section ->
                    ResumeSection.builder()
                        .resumeVariantId(targetVariantId)
                        .sectionType(section.getSectionType())
                        .title(section.getTitle())
                        .content(section.getContent())
                        .sortOrder(section.getSortOrder())
                        .hidden(section.isHidden())
                        .build())
            .toList();
    sectionRepository.saveAll(clones);
  }

  /**
   * Called from {@code ResumeService.upload} once a PDF is parsed: builds the initial base variant
   * + its sections from Claude's structured extraction, so the section editor has something to
   * start from instead of an empty document.
   */
  @Transactional
  public ResumeVariant createFromParsedResume(UUID userId, Resume resume, ParsedResume parsed) {
    variantRepository
        .findFirstByUserIdAndBaseIsTrueOrderByCreatedAtDesc(userId)
        .ifPresent(
            previous -> {
              previous.setBase(false);
              variantRepository.save(previous);
            });

    String name = resume.getLabel() != null ? resume.getLabel() : "Base Resume";
    if (variantRepository.existsByUserIdAndName(userId, name)) {
      name = name + " (" + resume.getId().toString().substring(0, 8) + ")";
    }

    ResumeVariant variant =
        variantRepository.save(
            ResumeVariant.builder()
                .userId(userId)
                .name(name)
                .base(true)
                .visibility(ResumeVisibility.PRIVATE)
                .stylingTemplate(StylingTemplate.MODERN)
                .fontFamily("Calibri")
                .accentColor("#0066cc")
                .sourceResumeId(resume.getId())
                .build());

    List<ResumeSection> sections = new ArrayList<>();
    int order = 0;
    if (parsed.experience() != null && !parsed.experience().isEmpty()) {
      sections.add(
          section(
              variant.getId(),
              SectionType.EXPERIENCE,
              order++,
              parsed.experience().stream()
                  .map(
                      experience ->
                          (Object)
                              Map.of(
                                  "position", nullToEmpty(experience.title()),
                                  "company", nullToEmpty(experience.company()),
                                  "startDate", nullToEmpty(experience.startDate()),
                                  "endDate", nullToEmpty(experience.endDate()),
                                  "description", nullToEmpty(experience.description())))
                  .toList()));
    }
    if (parsed.education() != null && !parsed.education().isEmpty()) {
      sections.add(
          section(
              variant.getId(),
              SectionType.EDUCATION,
              order++,
              parsed.education().stream()
                  .map(
                      education ->
                          (Object)
                              Map.of(
                                  "degree", nullToEmpty(education.degree()),
                                  "institution", nullToEmpty(education.school()),
                                  "field", nullToEmpty(education.field()),
                                  "graduationDate", nullToEmpty(education.graduationYear())))
                  .toList()));
    }
    if (parsed.skills() != null && !parsed.skills().isEmpty()) {
      sections.add(
          section(
              variant.getId(),
              SectionType.SKILLS,
              order++,
              List.of(
                  Map.of(
                      "category",
                      "General",
                      "skills",
                      parsed.skills().stream()
                          .map(skill -> Map.of("name", skill.name(), "proficiency", nullToEmpty(skill.proficiency())))
                          .toList()))));
    }
    if (parsed.certifications() != null && !parsed.certifications().isEmpty()) {
      sections.add(
          section(
              variant.getId(),
              SectionType.CERTIFICATIONS,
              order++,
              parsed.certifications().stream().map(name2 -> (Object) Map.of("name", name2)).toList()));
    }
    if (!sections.isEmpty()) {
      sectionRepository.saveAll(sections);
    }
    emitCreated(userId, variant);
    return variant;
  }

  private void emitCreated(UUID userId, ResumeVariant variant) {
    eventProducer.emit(
        JobEventTopics.RESUME_VARIANT_CREATED,
        userId,
        Map.of("resumeVariantId", variant.getId().toString(), "name", variant.getName()));
  }

  private static ResumeSection section(UUID variantId, SectionType type, int order, List<Object> content) {
    return ResumeSection.builder()
        .resumeVariantId(variantId)
        .sectionType(type)
        .sortOrder(order)
        .content(content)
        .build();
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
