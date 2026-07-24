package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.response.VaultEntryResponse;
import com.lifeos.vault.domains.dto.response.VaultExportCardResponse;
import com.lifeos.vault.domains.dto.response.VaultExportResponse;
import com.lifeos.vault.domains.entity.PaymentCard;
import com.lifeos.vault.domains.entity.VaultEntry;
import com.lifeos.vault.domains.record.VaultKeyRecord;
import com.lifeos.vault.exception.VaultLockedException;
import com.lifeos.vault.repository.PaymentCardRepository;
import com.lifeos.vault.repository.VaultEntryRepository;
import com.lifeos.vault.store.VaultKeyStore;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VaultExportService {

  private final VaultEntryRepository vaultEntryRepository;
  private final PaymentCardRepository paymentCardRepository;

  private final EncryptionService encryptionService;

  private final VaultKeyStore vaultKeyStore;

  public VaultExportResponse export(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    List<VaultEntryResponse> entries =
        vaultEntryRepository.findAllByUserId(userId).stream()
            .map(entry -> toVaultEntryResponse(entry, key))
            .toList();

    List<VaultExportCardResponse> cards =
        paymentCardRepository.findAllByUserId(userId).stream()
            .map(card -> toVaultExportCardResponse(card, key))
            .toList();

    return VaultExportResponse.builder()
        .entries(entries)
        .cards(cards)
        .exportedAt(Instant.now())
        .build();
  }

  private VaultEntryResponse toVaultEntryResponse(VaultEntry entry, SecretKey key) {
    String password =
        entry.getPasswordEncrypted() != null
            ? encryptionService.decrypt(entry.getPasswordEncrypted(), entry.getPasswordIv(), key)
            : null;
    String notes =
        entry.getNotesEncrypted() != null
            ? encryptionService.decrypt(entry.getNotesEncrypted(), entry.getNotesIv(), key)
            : null;

    return VaultEntryResponse.builder()
        .id(entry.getId())
        .type(entry.getType())
        .title(entry.getTitle())
        .email(entry.getEmail())
        .username(entry.getUsername())
        .url(entry.getUrl())
        .icon(entry.getIcon())
        .password(password)
        .notes(notes)
        .categoryId(entry.getCategoryId())
        .favorite(entry.isFavorite())
        .expiresAt(entry.getExpiresAt())
        .createdAt(entry.getCreatedAt())
        .updatedAt(entry.getUpdatedAt())
        .build();
  }

  private VaultExportCardResponse toVaultExportCardResponse(
      PaymentCard paymentCard, SecretKey key) {
    // expiry is null-checked because it was added in a later migration (V5) - cards
    // created before that have no expiryEncrypted, same defensive check CardService
    // already does. cardNumber/cvv have existed since card creation was first added
    // and CreateCardRequest requires both, so no card should ever be missing them.
    String expiry =
        paymentCard.getExpiryEncrypted() != null
            ? encryptionService.decrypt(
                paymentCard.getExpiryEncrypted(), paymentCard.getExpiryIv(), key)
            : null;

    return VaultExportCardResponse.builder()
        .id(paymentCard.getId())
        .nickname(paymentCard.getNickname())
        .network(paymentCard.getNetwork())
        .cardNumber(
            encryptionService.decrypt(
                paymentCard.getCardNumberEncrypted(), paymentCard.getCardNumberIv(), key))
        .cvv(
            encryptionService.decrypt(
                paymentCard.getCvvEncrypted(), paymentCard.getCvvIv(), key))
        .expiry(expiry)
        .cardHolderName(paymentCard.getCardHolderName())
        .billingZip(paymentCard.getBillingZip())
        .createdAt(paymentCard.getCreatedAt())
        .updatedAt(paymentCard.getUpdatedAt())
        .build();
  }

  private SecretKey requireUnlockedKey(UUID userId) {
    VaultKeyRecord record = vaultKeyStore.get(userId);

    if (record == null) {
      throw new VaultLockedException();
    }

    return record.key();
  }
}
