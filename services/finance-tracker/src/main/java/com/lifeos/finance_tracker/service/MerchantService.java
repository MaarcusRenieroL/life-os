package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.dto.request.CreateMerchantRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateMerchantRequest;
import com.lifeos.finance_tracker.domains.dto.response.MerchantResponse;
import com.lifeos.finance_tracker.domains.entity.Merchant;
import com.lifeos.finance_tracker.exception.MerchantNotFoundException;
import com.lifeos.finance_tracker.repository.MerchantRepository;
import com.lifeos.finance_tracker.util.DescriptionFingerprint;
import com.lifeos.finance_tracker.util.MerchantNameNormalizer;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
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

  // Looks up whether a raw imported description's fingerprint matches a
  // merchant the user has previously corrected (via rename()), so future
  // imports of the same merchant get the corrected name instead of the raw,
  // often-truncated bank narration text.
  public Optional<String> resolveCorrectedName(UUID userId, String rawDescription) {
    String fingerprint = DescriptionFingerprint.of(rawDescription);

    if (fingerprint.isBlank()) {
      return Optional.empty();
    }

    return merchantRepository.findAllByUserIdOrUserIdIsNull(userId).stream()
        .filter(m -> m.getAliases() != null && containsIgnoreCase(m.getAliases(), fingerprint))
        .map(Merchant::getName)
        .findFirst();
  }

  // Called whenever a user corrects a transaction's display name. Finds (or
  // creates) a merchant keyed by this description's fingerprint, renames it,
  // and records the fingerprint as an alias so the same raw narration
  // resolves to the corrected name on every future import too.
  public Merchant rename(UUID userId, String rawDescription, String correctedName) {
    String fingerprint = DescriptionFingerprint.of(rawDescription);

    Merchant merchant =
        merchantRepository.findAllByUserIdOrUserIdIsNull(userId).stream()
            .filter(m -> m.getAliases() != null && containsIgnoreCase(m.getAliases(), fingerprint))
            .findFirst()
            .orElseGet(
                () ->
                    Merchant.builder()
                        .userId(userId)
                        .aliases(new ArrayList<>())
                        .transactionCount(0)
                        .isRecognized(false)
                        .build());

    merchant.setName(correctedName);

    if (!fingerprint.isBlank()) {
      List<String> aliases = merchant.getAliases() == null ? new ArrayList<>() : new ArrayList<>(merchant.getAliases());
      if (!containsIgnoreCase(aliases, fingerprint)) {
        aliases.add(fingerprint);
      }
      merchant.setAliases(aliases);
    }

    return merchantRepository.save(merchant);
  }

  // Called on every transaction creation path (manual, CSV import, email
  // alert) - previously merchants were only ever created by the recurring-
  // pattern detector, so one-off and non-recurring transactions never got a
  // merchant record at all and the Merchants screen stayed empty. Matches by
  // the same alias-fingerprint scheme as rename()/resolveCorrectedName() so
  // a merchant renamed via the transaction detail page keeps accumulating
  // stats under its corrected name instead of splitting into a duplicate.
  public void recordTransaction(UUID userId, String description, BigDecimal amount) {
    String fingerprint = DescriptionFingerprint.of(description);

    if (fingerprint.isBlank()) {
      return;
    }

    Merchant merchant =
        merchantRepository.findAllByUserIdOrUserIdIsNull(userId).stream()
            .filter(m -> m.getAliases() != null && containsIgnoreCase(m.getAliases(), fingerprint))
            .findFirst()
            .or(() -> merchantRepository.findByUserIdAndNameIgnoreCase(userId, description))
            .orElseGet(
                () ->
                    Merchant.builder()
                        .userId(userId)
                        .name(MerchantNameNormalizer.normalize(description))
                        .aliases(new ArrayList<>())
                        .transactionCount(0)
                        .isRecognized(true)
                        .build());

    int previousCount = merchant.getTransactionCount();
    BigDecimal previousAverage =
        merchant.getAverageTransactionAmount() == null ? BigDecimal.ZERO : merchant.getAverageTransactionAmount();
    BigDecimal newAverage =
        previousAverage
            .multiply(BigDecimal.valueOf(previousCount))
            .add(amount)
            .divide(BigDecimal.valueOf(previousCount + 1), 2, RoundingMode.HALF_UP);

    merchant.setTransactionCount(previousCount + 1);
    merchant.setAverageTransactionAmount(newAverage);
    merchant.setLastTransactionDate(Instant.now());
    merchant.setRecognized(true);

    List<String> aliases = merchant.getAliases() == null ? new ArrayList<>() : new ArrayList<>(merchant.getAliases());
    if (!containsIgnoreCase(aliases, fingerprint)) {
      aliases.add(fingerprint);
    }
    merchant.setAliases(aliases);

    merchantRepository.save(merchant);
  }

  private boolean containsIgnoreCase(List<String> values, String target) {
    return values.stream().anyMatch(v -> v.equalsIgnoreCase(target));
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
