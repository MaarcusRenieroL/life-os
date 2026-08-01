package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.request.CreateVaultCategoryRequest;
import com.lifeos.vault.domains.dto.request.UpdateVaultCategoryRequest;
import com.lifeos.vault.domains.dto.response.VaultCategoryResponse;
import com.lifeos.vault.domains.entity.VaultCategory;
import com.lifeos.vault.exception.VaultCategoryAlreadyExistsException;
import com.lifeos.vault.exception.VaultCategoryNotFoundException;
import com.lifeos.vault.repository.VaultCategoryRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VaultCategoryService {

  private final VaultCategoryRepository vaultCategoryRepository;

  public List<VaultCategoryResponse> getCategories(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return vaultCategoryRepository.findAllByUserId(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  public VaultCategoryResponse createCategory(
      Authentication authentication, CreateVaultCategoryRequest request) {

    UUID userId = (UUID) authentication.getPrincipal();

    if (vaultCategoryRepository.existsByUserIdAndName(userId, request.getName())) {
      throw new VaultCategoryAlreadyExistsException(request.getName());
    }

    VaultCategory vaultCategory =
        vaultCategoryRepository.save(
            VaultCategory.builder()
                .userId(userId)
                .name(request.getName())
                .color(request.getColor())
                .build());

    return toResponse(vaultCategory);
  }

  public VaultCategoryResponse getCategory(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    VaultCategory vaultCategory =
        vaultCategoryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new VaultCategoryNotFoundException(id));

    return toResponse(vaultCategory);
  }

  public VaultCategoryResponse updateCategory(
      Authentication authentication, UUID id, UpdateVaultCategoryRequest request) {

    UUID userId = (UUID) authentication.getPrincipal();

    VaultCategory vaultCategory =
        vaultCategoryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new VaultCategoryNotFoundException(id));

    if (!vaultCategory.getName().equals(request.getName())
        && vaultCategoryRepository.existsByUserIdAndName(userId, request.getName())) {
      throw new VaultCategoryAlreadyExistsException(request.getName());
    }

    vaultCategory.setName(request.getName());
    vaultCategory.setColor(request.getColor());

    return toResponse(vaultCategoryRepository.save(vaultCategory));
  }

  @Transactional
  public void deleteCategory(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    vaultCategoryRepository.deleteByIdAndUserId(id, userId);
  }

  private VaultCategoryResponse toResponse(VaultCategory vaultCategory) {
    return VaultCategoryResponse.builder()
        .id(vaultCategory.getId())
        .name(vaultCategory.getName())
        .color(vaultCategory.getColor())
        .createdAt(vaultCategory.getCreatedAt())
        .updatedAt(vaultCategory.getUpdatedAt())
        .build();
  }
}
