package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CreateCategorizationRuleRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateCategorizationRuleRequest;
import com.lifeos.finance_tracker.domains.dto.response.CategorizationRuleResponse;
import com.lifeos.finance_tracker.domains.entity.CategorizationRule;
import com.lifeos.finance_tracker.exception.CategorizationRuleNotFoundException;
import com.lifeos.finance_tracker.repository.CategorizationRuleRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class CategorizationRuleService {

  private final CategorizationRuleRepository categorizationRuleRepository;

  public List<CategorizationRuleResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return categorizationRuleRepository.findAllByUserId(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  public CategorizationRuleResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toResponse(
        categorizationRuleRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new CategorizationRuleNotFoundException(id)));
  }

  public CategorizationRuleResponse save(
      Authentication authentication, CreateCategorizationRuleRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    CategorizationRule rule =
        CategorizationRule.builder()
            .userId(userId)
            .categoryId(request.getCategoryId())
            .matchType(request.getMatchType())
            .matchField(request.getMatchField())
            .matchValue(request.getMatchValue())
            .priority(request.getPriority())
            .isActive(true)
            .hitCount(0)
            .build();

    return toResponse(categorizationRuleRepository.save(rule));
  }

  public CategorizationRuleResponse update(
      Authentication authentication, UUID id, UpdateCategorizationRuleRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    CategorizationRule rule =
        categorizationRuleRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new CategorizationRuleNotFoundException(id));

    if (request.getCategoryId() != null) {
      rule.setCategoryId(request.getCategoryId());
    }

    if (request.getMatchType() != null) {
      rule.setMatchType(request.getMatchType());
    }

    if (request.getMatchField() != null) {
      rule.setMatchField(request.getMatchField());
    }

    if (StringUtils.hasText(request.getMatchValue())) {
      rule.setMatchValue(request.getMatchValue());
    }

    if (request.getPriority() != null) {
      rule.setPriority(request.getPriority());
    }

    if (request.getIsActive() != null) {
      rule.setActive(request.getIsActive());
    }

    return toResponse(categorizationRuleRepository.save(rule));
  }

  public void delete(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    categorizationRuleRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new CategorizationRuleNotFoundException(id));

    categorizationRuleRepository.deleteByIdAndUserId(id, userId);
  }

  private CategorizationRuleResponse toResponse(CategorizationRule rule) {
    return CategorizationRuleResponse.builder()
        .id(rule.getId())
        .categoryId(rule.getCategoryId())
        .matchType(rule.getMatchType())
        .matchField(rule.getMatchField())
        .matchValue(rule.getMatchValue())
        .priority(rule.getPriority())
        .isActive(rule.isActive())
        .hitCount(rule.getHitCount())
        .createdAt(rule.getCreatedAt())
        .updatedAt(rule.getUpdatedAt())
        .build();
  }
}
