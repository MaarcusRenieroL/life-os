package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.CreateResumeSectionRequest;
import com.lifeos.job_tracker.domains.dto.request.UpdateResumeSectionRequest;
import com.lifeos.job_tracker.domains.entity.ResumeSection;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.ResumeSectionRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ResumeSectionService {

  private final ResumeSectionRepository sectionRepository;
  private final ResumeVariantService resumeVariantService;
  private final JobEventProducer eventProducer;

  @Transactional(readOnly = true)
  public List<ResumeSection> list(UUID userId, UUID variantId) {
    return resumeVariantService.sections(userId, variantId);
  }

  @Transactional
  public ResumeSection create(UUID userId, UUID variantId, CreateResumeSectionRequest request) {
    resumeVariantService.get(userId, variantId);
    int sortOrder =
        request.sortOrder() != null
            ? request.sortOrder()
            : sectionRepository.findAllByResumeVariantIdOrderBySortOrderAsc(variantId).size();
    return sectionRepository.save(
        ResumeSection.builder()
            .resumeVariantId(variantId)
            .sectionType(request.sectionType())
            .title(request.title())
            .content(request.content() == null ? List.of() : request.content())
            .sortOrder(sortOrder)
            .build());
  }

  @Transactional
  public ResumeSection update(UUID userId, UUID variantId, UUID sectionId, UpdateResumeSectionRequest request) {
    ResumeSection section = require(userId, variantId, sectionId);
    if (request.title() != null) {
      section.setTitle(request.title());
    }
    if (request.content() != null) {
      section.setContent(request.content());
    }
    if (request.sortOrder() != null) {
      section.setSortOrder(request.sortOrder());
    }
    if (request.isHidden() != null) {
      section.setHidden(request.isHidden());
    }
    ResumeSection saved = sectionRepository.save(section);
    eventProducer.emit(
        JobEventTopics.RESUME_SECTION_UPDATED,
        userId,
        Map.of("resumeVariantId", variantId.toString(), "sectionId", sectionId.toString()));
    return saved;
  }

  @Transactional
  public void delete(UUID userId, UUID variantId, UUID sectionId) {
    ResumeSection section = require(userId, variantId, sectionId);
    sectionRepository.delete(section);
  }

  @Transactional
  public List<ResumeSection> reorder(UUID userId, UUID variantId, List<UUID> orderedSectionIds) {
    resumeVariantService.get(userId, variantId);
    List<ResumeSection> sections = sectionRepository.findAllByResumeVariantIdOrderBySortOrderAsc(variantId);
    Map<UUID, ResumeSection> byId = new java.util.HashMap<>();
    sections.forEach(section -> byId.put(section.getId(), section));

    for (int i = 0; i < orderedSectionIds.size(); i++) {
      ResumeSection section = byId.get(orderedSectionIds.get(i));
      if (section == null) {
        throw new InvalidRequestException("Section " + orderedSectionIds.get(i) + " does not belong to this variant");
      }
      section.setSortOrder(i);
    }
    return sectionRepository.saveAll(sections);
  }

  /** Appends one entry (a job, a degree, ...) to a section's content array. */
  @Transactional
  public ResumeSection addEntry(UUID userId, UUID variantId, String sectionType, Map<String, Object> entry) {
    ResumeSection section = requireSectionOfType(userId, variantId, sectionType);
    List<Object> content = new ArrayList<>(section.getContent() == null ? List.of() : section.getContent());
    content.add(entry);
    section.setContent(content);
    return sectionRepository.save(section);
  }

  @Transactional
  public ResumeSection updateEntry(UUID userId, UUID variantId, String sectionType, int index, Map<String, Object> entry) {
    ResumeSection section = requireSectionOfType(userId, variantId, sectionType);
    List<Object> content = new ArrayList<>(section.getContent() == null ? List.of() : section.getContent());
    if (index < 0 || index >= content.size()) {
      throw new InvalidRequestException("No entry at index " + index);
    }
    content.set(index, entry);
    section.setContent(content);
    return sectionRepository.save(section);
  }

  @Transactional
  public ResumeSection deleteEntry(UUID userId, UUID variantId, String sectionType, int index) {
    ResumeSection section = requireSectionOfType(userId, variantId, sectionType);
    List<Object> content = new ArrayList<>(section.getContent() == null ? List.of() : section.getContent());
    if (index < 0 || index >= content.size()) {
      throw new InvalidRequestException("No entry at index " + index);
    }
    content.remove(index);
    section.setContent(content);
    return sectionRepository.save(section);
  }

  private ResumeSection requireSectionOfType(UUID userId, UUID variantId, String sectionType) {
    resumeVariantService.get(userId, variantId);
    return sectionRepository.findAllByResumeVariantIdOrderBySortOrderAsc(variantId).stream()
        .filter(section -> section.getSectionType() != null && section.getSectionType().name().equals(sectionType))
        .findFirst()
        .orElseThrow(
            () -> new InvalidRequestException("This variant has no " + sectionType + " section yet - create it first"));
  }

  private ResumeSection require(UUID userId, UUID variantId, UUID sectionId) {
    resumeVariantService.get(userId, variantId);
    return sectionRepository
        .findByIdAndResumeVariantId(sectionId, variantId)
        .orElseThrow(() -> ResourceNotFoundException.of("Resume section", sectionId));
  }
}
