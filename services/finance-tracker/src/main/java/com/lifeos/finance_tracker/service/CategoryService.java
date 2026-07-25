package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CreateCategoryRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateCategoryRequest;
import com.lifeos.finance_tracker.domains.dto.response.CategoryResponse;
import com.lifeos.finance_tracker.domains.entity.Category;
import com.lifeos.finance_tracker.exception.CategoryNotFoundException;
import com.lifeos.finance_tracker.repository.CategoryRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class CategoryService {

  private final CategoryRepository categoryRepository;

  public List<CategoryResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return categoryRepository.findAllByUserIdOrUserIdIsNull(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  public CategoryResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toResponse(
        categoryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new CategoryNotFoundException(id)));
  }

  public CategoryResponse save(Authentication authentication, CreateCategoryRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Category category =
        Category.builder()
            .userId(userId)
            .name(request.getName())
            .type(request.getType())
            .color(request.getColor())
            .icon(request.getIcon())
            .parentCategoryId(request.getParentCategoryId())
            .isActive(true)
            .displayOrder(request.getDisplayOrder())
            .build();

    return toResponse(categoryRepository.save(category));
  }

  public CategoryResponse update(Authentication authentication, UUID id, UpdateCategoryRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Category category =
        categoryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new CategoryNotFoundException(id));

    if (StringUtils.hasText(request.getName())) {
      category.setName(request.getName());
    }

    if (request.getType() != null) {
      category.setType(request.getType());
    }

    if (StringUtils.hasText(request.getColor())) {
      category.setColor(request.getColor());
    }

    if (StringUtils.hasText(request.getIcon())) {
      category.setIcon(request.getIcon());
    }

    if (request.getParentCategoryId() != null) {
      category.setParentCategoryId(request.getParentCategoryId());
    }

    if (request.getIsActive() != null) {
      category.setActive(request.getIsActive());
    }

    if (request.getDisplayOrder() != null) {
      category.setDisplayOrder(request.getDisplayOrder());
    }

    return toResponse(categoryRepository.save(category));
  }

  public void delete(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    categoryRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new CategoryNotFoundException(id));

    categoryRepository.deleteByIdAndUserId(id, userId);
  }

  private CategoryResponse toResponse(Category category) {
    return CategoryResponse.builder()
        .id(category.getId())
        .name(category.getName())
        .type(category.getType())
        .color(category.getColor())
        .icon(category.getIcon())
        .parentCategoryId(category.getParentCategoryId())
        .isActive(category.isActive())
        .displayOrder(category.getDisplayOrder())
        .createdAt(category.getCreatedAt())
        .build();
  }
}
