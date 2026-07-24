package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.response.PaymentCardSnapshotResponse;
import com.lifeos.vault.domains.dto.response.VaultBackupSnapshotResponse;
import com.lifeos.vault.domains.dto.response.VaultCategorySnapshotResponse;
import com.lifeos.vault.domains.dto.response.VaultEntrySnapshotResponse;
import com.lifeos.vault.domains.dto.response.VaultMasterPasswordSnapshotResponse;
import com.lifeos.vault.domains.entity.PaymentCard;
import com.lifeos.vault.domains.entity.VaultCategory;
import com.lifeos.vault.domains.entity.VaultEntry;
import com.lifeos.vault.domains.entity.VaultMasterPassword;
import com.lifeos.vault.repository.PaymentCardRepository;
import com.lifeos.vault.repository.RecoveryCodeRepository;
import com.lifeos.vault.repository.VaultCategoryRepository;
import com.lifeos.vault.repository.VaultEntryRepository;
import com.lifeos.vault.repository.VaultMasterPasswordRepository;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.hibernate.ReplicationMode;
import org.hibernate.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VaultBackupService {

  private final VaultEntryRepository vaultEntryRepository;
  private final PaymentCardRepository paymentCardRepository;
  private final VaultCategoryRepository vaultCategoryRepository;
  private final VaultMasterPasswordRepository vaultMasterPasswordRepository;
  private final RecoveryCodeRepository recoveryCodeRepository;
  private final EntityManager entityManager;

  public VaultBackupSnapshotResponse snapshot(UUID userId) {
    return VaultBackupSnapshotResponse.builder()
        .entries(
            vaultEntryRepository.findAllByUserId(userId).stream()
                .map(this::toVaultEntrySnapshotResponse)
                .toList())
        .cards(
            paymentCardRepository.findAllByUserId(userId).stream()
                .map(this::toPaymentCardSnapshotResponse)
                .toList())
        .categories(
            vaultCategoryRepository.findAllByUserId(userId).stream()
                .map(this::toVaultCategorySnapshotResponse)
                .toList())
        .masterPassword(
            vaultMasterPasswordRepository
                .findByUserId(userId)
                .map(this::toVaultMasterPasswordSnapshotResponse)
                .orElse(null))
        .snapshotAt(Instant.now())
        .build();
  }

  @Transactional
  public void restore(UUID userId, VaultBackupSnapshotResponse snapshot) {
    vaultEntryRepository.deleteAllByUserId(userId);
    paymentCardRepository.deleteAllByUserId(userId);
    vaultCategoryRepository.deleteAllByUserId(userId);
    vaultMasterPasswordRepository.deleteByUserId(userId);
    recoveryCodeRepository.deleteAllByUserId(userId);
    entityManager.flush();
    entityManager.clear();

    Session session = entityManager.unwrap(Session.class);

    snapshot.getCategories().stream()
        .map(dto -> toVaultCategory(dto, userId))
        .forEach(entity -> session.replicate(entity, ReplicationMode.OVERWRITE));

    if (snapshot.getMasterPassword() != null) {
      session.replicate(
          toVaultMasterPassword(snapshot.getMasterPassword(), userId), ReplicationMode.OVERWRITE);
    }

    snapshot.getEntries().stream()
        .map(dto -> toVaultEntry(dto, userId))
        .forEach(entity -> session.replicate(entity, ReplicationMode.OVERWRITE));

    snapshot.getCards().stream()
        .map(dto -> toPaymentCard(dto, userId))
        .forEach(entity -> session.replicate(entity, ReplicationMode.OVERWRITE));
  }

  private VaultEntrySnapshotResponse toVaultEntrySnapshotResponse(VaultEntry vaultEntry) {
    return VaultEntrySnapshotResponse.builder()
        .id(vaultEntry.getId())
        .type(vaultEntry.getType())
        .title(vaultEntry.getTitle())
        .email(vaultEntry.getEmail())
        .username(vaultEntry.getUsername())
        .url(vaultEntry.getUrl())
        .icon(vaultEntry.getIcon())
        .passwordEncrypted(vaultEntry.getPasswordEncrypted())
        .passwordIv(vaultEntry.getPasswordIv())
        .notesEncrypted(vaultEntry.getNotesEncrypted())
        .notesIv(vaultEntry.getNotesIv())
        .categoryId(vaultEntry.getCategoryId())
        .favorite(vaultEntry.isFavorite())
        .expiresAt(vaultEntry.getExpiresAt())
        .createdAt(vaultEntry.getCreatedAt())
        .updatedAt(vaultEntry.getUpdatedAt())
        .build();
  }

  private PaymentCardSnapshotResponse toPaymentCardSnapshotResponse(PaymentCard paymentCard) {
    return PaymentCardSnapshotResponse.builder()
        .id(paymentCard.getId())
        .nickname(paymentCard.getNickname())
        .network(paymentCard.getNetwork())
        .lastFourDigits(paymentCard.getLastFourDigits())
        .cardNumberEncrypted(paymentCard.getCardNumberEncrypted())
        .cardNumberIv(paymentCard.getCardNumberIv())
        .passwordEncrypted(paymentCard.getPasswordEncrypted())
        .passwordIv(paymentCard.getPasswordIv())
        .cvvEncrypted(paymentCard.getCvvEncrypted())
        .cvvIv(paymentCard.getCvvIv())
        .expiryEncrypted(paymentCard.getExpiryEncrypted())
        .expiryIv(paymentCard.getExpiryIv())
        .cardHolderName(paymentCard.getCardHolderName())
        .billingZip(paymentCard.getBillingZip())
        .createdAt(paymentCard.getCreatedAt())
        .updatedAt(paymentCard.getUpdatedAt())
        .build();
  }

  private VaultCategorySnapshotResponse toVaultCategorySnapshotResponse(
      VaultCategory vaultCategory) {
    return VaultCategorySnapshotResponse.builder()
        .id(vaultCategory.getId())
        .name(vaultCategory.getName())
        .color(vaultCategory.getColor())
        .createdAt(vaultCategory.getCreatedAt())
        .updatedAt(vaultCategory.getUpdatedAt())
        .build();
  }

  private VaultMasterPasswordSnapshotResponse toVaultMasterPasswordSnapshotResponse(
      VaultMasterPassword vaultMasterPassword) {
    return VaultMasterPasswordSnapshotResponse.builder()
        .id(vaultMasterPassword.getId())
        .passwordHash(vaultMasterPassword.getPasswordHash())
        .salt(vaultMasterPassword.getSalt())
        .strength(vaultMasterPassword.getStrength())
        .createdAt(vaultMasterPassword.getCreatedAt())
        .updatedAt(vaultMasterPassword.getUpdatedAt())
        .build();
  }

  private VaultEntry toVaultEntry(VaultEntrySnapshotResponse dto, UUID userId) {
    return VaultEntry.builder()
        .id(dto.getId())
        .userId(userId)
        .type(dto.getType())
        .title(dto.getTitle())
        .email(dto.getEmail())
        .username(dto.getUsername())
        .url(dto.getUrl())
        .icon(dto.getIcon())
        .passwordEncrypted(dto.getPasswordEncrypted())
        .passwordIv(dto.getPasswordIv())
        .notesEncrypted(dto.getNotesEncrypted())
        .notesIv(dto.getNotesIv())
        .categoryId(dto.getCategoryId())
        .favorite(dto.isFavorite())
        .expiresAt(dto.getExpiresAt())
        .build();
  }

  private PaymentCard toPaymentCard(PaymentCardSnapshotResponse dto, UUID userId) {
    return PaymentCard.builder()
        .id(dto.getId())
        .userId(userId)
        .nickname(dto.getNickname())
        .network(dto.getNetwork())
        .lastFourDigits(dto.getLastFourDigits())
        .cardNumberEncrypted(dto.getCardNumberEncrypted())
        .cardNumberIv(dto.getCardNumberIv())
        .passwordEncrypted(dto.getPasswordEncrypted())
        .passwordIv(dto.getPasswordIv())
        .cvvEncrypted(dto.getCvvEncrypted())
        .cvvIv(dto.getCvvIv())
        .expiryEncrypted(dto.getExpiryEncrypted())
        .expiryIv(dto.getExpiryIv())
        .cardHolderName(dto.getCardHolderName())
        .billingZip(dto.getBillingZip())
        .build();
  }

  private VaultCategory toVaultCategory(VaultCategorySnapshotResponse dto, UUID userId) {
    return VaultCategory.builder()
        .id(dto.getId())
        .userId(userId)
        .name(dto.getName())
        .color(dto.getColor())
        .build();
  }

  private VaultMasterPassword toVaultMasterPassword(
      VaultMasterPasswordSnapshotResponse dto, UUID userId) {
    return VaultMasterPassword.builder()
        .id(dto.getId())
        .userId(userId)
        .passwordHash(dto.getPasswordHash())
        .salt(dto.getSalt())
        .strength(dto.getStrength())
        .build();
  }
}
