package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpsertAccomplishmentRequest;
import com.lifeos.job_tracker.domains.entity.Accomplishment;
import com.lifeos.job_tracker.domains.entity.ResumeSection;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.kafka.JobEventProducer;
import com.lifeos.job_tracker.kafka.JobEventTopics;
import com.lifeos.job_tracker.repository.AccomplishmentRepository;
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
public class AccomplishmentService {

  private final AccomplishmentRepository accomplishmentRepository;
  private final ResumeSectionRepository sectionRepository;
  private final JobEventProducer eventProducer;

  @Transactional(readOnly = true)
  public List<Accomplishment> list(UUID userId, String category, String search) {
    if (search != null && !search.isBlank()) {
      return accomplishmentRepository.findAllByUserIdAndBulletTextContainingIgnoreCase(userId, search);
    }
    return category != null && !category.isBlank()
        ? accomplishmentRepository.findAllByUserIdAndCategoryOrderByUsageCountDescCreatedAtDesc(userId, category)
        : accomplishmentRepository.findAllByUserIdOrderByUsageCountDescCreatedAtDesc(userId);
  }

  @Transactional
  public Accomplishment create(UUID userId, UpsertAccomplishmentRequest request) {
    Accomplishment saved =
        accomplishmentRepository.save(
            Accomplishment.builder()
                .userId(userId)
                .category(request.category())
                .bulletText(request.bulletText())
                .keywords(request.keywords())
                .sourceSectionId(request.sourceSectionId())
                .build());
    eventProducer.emit(JobEventTopics.ACCOMPLISHMENT_ADDED, userId, Map.of("accomplishmentId", saved.getId().toString()));
    return saved;
  }

  @Transactional
  public Accomplishment update(UUID userId, UUID accomplishmentId, UpsertAccomplishmentRequest request) {
    Accomplishment accomplishment = require(userId, accomplishmentId);
    accomplishment.setCategory(request.category());
    accomplishment.setBulletText(request.bulletText());
    accomplishment.setKeywords(request.keywords());
    return accomplishmentRepository.save(accomplishment);
  }

  @Transactional
  public void delete(UUID userId, UUID accomplishmentId) {
    accomplishmentRepository.delete(require(userId, accomplishmentId));
  }

  /** Appends the accomplishment's bullet text as a new entry on the target section, incrementing usage. */
  @Transactional
  public ResumeSection addToSection(UUID userId, UUID accomplishmentId, UUID resumeVariantId, UUID sectionId) {
    Accomplishment accomplishment = require(userId, accomplishmentId);
    ResumeSection section =
        sectionRepository
            .findByIdAndResumeVariantId(sectionId, resumeVariantId)
            .orElseThrow(() -> ResourceNotFoundException.of("Resume section", sectionId));

    List<Object> content = new ArrayList<>(section.getContent() == null ? List.of() : section.getContent());
    content.add(Map.of("bullet", accomplishment.getBulletText()));
    section.setContent(content);

    accomplishment.setUsageCount(accomplishment.getUsageCount() + 1);
    accomplishmentRepository.save(accomplishment);
    return sectionRepository.save(section);
  }

  private Accomplishment require(UUID userId, UUID accomplishmentId) {
    return accomplishmentRepository
        .findByIdAndUserId(accomplishmentId, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Accomplishment", accomplishmentId));
  }
}
