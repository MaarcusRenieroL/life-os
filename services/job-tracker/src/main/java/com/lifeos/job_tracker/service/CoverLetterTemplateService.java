package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpsertCoverLetterTemplateRequest;
import com.lifeos.job_tracker.domains.entity.CoverLetterTemplate;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.repository.CoverLetterTemplateRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CoverLetterTemplateService {

  private final CoverLetterTemplateRepository templateRepository;

  @Transactional(readOnly = true)
  public List<CoverLetterTemplate> list(UUID userId) {
    return templateRepository.findAllByUserIdIsNullOrUserId(userId);
  }

  @Transactional
  public CoverLetterTemplate create(UUID userId, UpsertCoverLetterTemplateRequest request) {
    return templateRepository.save(
        CoverLetterTemplate.builder()
            .userId(userId)
            .name(request.name())
            .description(request.description())
            .contentStructure(request.contentStructure())
            .tone(request.tone())
            .style(request.style())
            .build());
  }

  @Transactional
  public CoverLetterTemplate update(UUID userId, UUID templateId, UpsertCoverLetterTemplateRequest request) {
    CoverLetterTemplate template = requireOwned(userId, templateId);
    template.setName(request.name());
    template.setDescription(request.description());
    template.setContentStructure(request.contentStructure());
    template.setTone(request.tone());
    template.setStyle(request.style());
    return templateRepository.save(template);
  }

  @Transactional
  public void delete(UUID userId, UUID templateId) {
    templateRepository.delete(requireOwned(userId, templateId));
  }

  private CoverLetterTemplate requireOwned(UUID userId, UUID templateId) {
    CoverLetterTemplate template =
        templateRepository
            .findById(templateId)
            .orElseThrow(() -> ResourceNotFoundException.of("Cover letter template", templateId));
    if (template.isSystem() || !userId.equals(template.getUserId())) {
      throw new InvalidRequestException("Cannot modify a system template or one you don't own");
    }
    return template;
  }
}
