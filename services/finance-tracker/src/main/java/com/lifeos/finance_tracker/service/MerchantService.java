package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CreateMerchantRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateMerchantRequest;
import com.lifeos.finance_tracker.domains.dto.response.MerchantResponse;
import com.lifeos.finance_tracker.domains.entity.Merchant;
import com.lifeos.finance_tracker.exception.MerchantNotFoundException;
import com.lifeos.finance_tracker.repository.MerchantRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class MerchantService {

  private final MerchantRepository merchantRepository;

  public List<MerchantResponse> getAll(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return merchantRepository.findAllByUserIdOrUserIdIsNull(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  public MerchantResponse get(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    return toResponse(
        merchantRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new MerchantNotFoundException(id)));
  }

  public MerchantResponse save(Authentication authentication, CreateMerchantRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Merchant merchant =
        Merchant.builder()
            .userId(userId)
            .name(request.getName())
            .description(request.getDescription())
            .categoryId(request.getCategoryId())
            .logoUrl(request.getLogoUrl())
            .website(request.getWebsite())
            .aliases(request.getAliases())
            .transactionCount(0)
            .isRecognized(false)
            .build();

    return toResponse(merchantRepository.save(merchant));
  }

  public MerchantResponse update(Authentication authentication, UUID id, UpdateMerchantRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();

    Merchant merchant =
        merchantRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new MerchantNotFoundException(id));

    if (StringUtils.hasText(request.getName())) {
      merchant.setName(request.getName());
    }

    if (request.getDescription() != null) {
      merchant.setDescription(request.getDescription());
    }

    if (request.getCategoryId() != null) {
      merchant.setCategoryId(request.getCategoryId());
    }

    if (StringUtils.hasText(request.getLogoUrl())) {
      merchant.setLogoUrl(request.getLogoUrl());
    }

    if (StringUtils.hasText(request.getWebsite())) {
      merchant.setWebsite(request.getWebsite());
    }

    if (request.getAliases() != null) {
      merchant.setAliases(request.getAliases());
    }

    return toResponse(merchantRepository.save(merchant));
  }

  public void delete(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();

    merchantRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new MerchantNotFoundException(id));

    merchantRepository.deleteByIdAndUserId(id, userId);
  }

  private MerchantResponse toResponse(Merchant merchant) {
    return MerchantResponse.builder()
        .id(merchant.getId())
        .name(merchant.getName())
        .description(merchant.getDescription())
        .categoryId(merchant.getCategoryId())
        .logoUrl(merchant.getLogoUrl())
        .website(merchant.getWebsite())
        .transactionCount(merchant.getTransactionCount())
        .lastTransactionDate(merchant.getLastTransactionDate())
        .averageTransactionAmount(merchant.getAverageTransactionAmount())
        .aliases(merchant.getAliases())
        .isRecognized(merchant.isRecognized())
        .createdAt(merchant.getCreatedAt())
        .build();
  }
}
