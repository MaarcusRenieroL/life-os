package com.lifeos.core.service;

import com.lifeos.core.domains.dto.request.CreateTemplateRequest;
import com.lifeos.core.domains.dto.request.UpdateTemplateRequest;
import com.lifeos.core.domains.dto.request.UseTemplateRequest;
import com.lifeos.core.domains.dto.response.NoteResponse;
import com.lifeos.core.domains.dto.response.TemplateResponse;
import com.lifeos.core.domains.entity.NoteTemplate;
import com.lifeos.core.exception.NoteTemplateNotFoundException;
import com.lifeos.core.repository.NoteTemplateRepository;
import com.lifeos.core.util.NoteContentUtil;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteTemplateService {

  private final NoteTemplateRepository noteTemplateRepository;
  private final NoteService noteService;

  public Page<TemplateResponse> list(UUID userId, String category, Pageable pageable) {
    Page<NoteTemplate> page =
        StringUtils.hasText(category)
            ? noteTemplateRepository.findAllByUserIdAndCategory(userId, category, pageable)
            : noteTemplateRepository.findAllByUserId(userId, pageable);

    return page.map(this::toResponse);
  }

  public TemplateResponse create(UUID userId, CreateTemplateRequest request) {
    NoteTemplate template =
        NoteTemplate.builder()
            .userId(userId)
            .name(request.getName())
            .content(request.getContent())
            .category(request.getCategory())
            .build();

    return toResponse(noteTemplateRepository.saveAndFlush(template));
  }

  public TemplateResponse update(UUID userId, UUID id, UpdateTemplateRequest request) {
    NoteTemplate template = requireOwned(userId, id);

    if (StringUtils.hasText(request.getName())) {
      template.setName(request.getName());
    }

    if (request.getContent() != null) {
      template.setContent(request.getContent());
    }

    if (request.getCategory() != null) {
      template.setCategory(request.getCategory());
    }

    return toResponse(noteTemplateRepository.saveAndFlush(template));
  }

  public void delete(UUID userId, UUID id) {
    requireOwned(userId, id);
    noteTemplateRepository.deleteByIdAndUserId(id, userId);
  }

  public NoteResponse use(UUID userId, UUID id, UseTemplateRequest request) {
    NoteTemplate template = requireOwned(userId, id);

    return noteService.createFromTemplate(userId, request.getTitle(), template.getContent());
  }

  private NoteTemplate requireOwned(UUID userId, UUID id) {
    return noteTemplateRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new NoteTemplateNotFoundException(id));
  }

  private TemplateResponse toResponse(NoteTemplate template) {
    return TemplateResponse.builder()
        .id(template.getId())
        .name(template.getName())
        .content(template.getContent())
        .category(template.getCategory())
        .preview(NoteContentUtil.excerpt(NoteContentUtil.toPlainText(template.getContent()), 200))
        .createdAt(template.getCreatedAt())
        .updatedAt(template.getUpdatedAt())
        .build();
  }
}
