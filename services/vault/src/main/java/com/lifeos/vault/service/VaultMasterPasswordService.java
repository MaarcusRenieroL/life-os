package com.lifeos.vault.service;

import com.lifeos.common.events.AuditEventType;
import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.vault.domains.dto.response.VaultStatusResponse;
import com.lifeos.vault.domains.entity.PaymentCard;
import com.lifeos.vault.domains.entity.VaultEntry;
import com.lifeos.vault.domains.entity.VaultMasterPassword;
import com.lifeos.vault.domains.record.VaultKeyRecord;
import com.lifeos.vault.exception.InvalidMasterPasswordException;
import com.lifeos.vault.exception.InvalidVaultRequestException;
import com.lifeos.vault.exception.MasterPasswordAlreadySetException;
import com.lifeos.common.events.AuditEventPublisher;
import com.lifeos.vault.repository.PaymentCardRepository;
import com.lifeos.vault.repository.RecoveryCodeRepository;
import com.lifeos.vault.repository.VaultEntryRepository;
import com.lifeos.vault.repository.VaultMasterPasswordRepository;
import com.lifeos.vault.store.VaultKeyStore;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VaultMasterPasswordService {

  private static final long VAULT_UNLOCK_DURATION_SECONDS = 900;
  private static final int MIN_MASTER_PASSWORD_LENGTH = 8;

  private final VaultEntryRepository vaultEntryRepository;
  private final VaultMasterPasswordRepository vaultMasterPasswordRepository;
  private final PaymentCardRepository paymentCardRepository;
  private final RecoveryCodeRepository recoveryCodeRepository;

  private final EncryptionService encryptionService;
  private final PasswordEncoder passwordEncoder;
  private final PasswordStrengthService passwordStrengthService;
  private final VaultKeyStore vaultKeyStore;
  private final UnlockAttemptLimiter attemptLimiter;

  private final AuditEventPublisher auditEventPublisher;
  private final NotificationEventPublisher notificationEventPublisher;

  public void setup(UUID userId, String masterPassword) {
    if (vaultMasterPasswordRepository.existsByUserId(userId)) {
      throw new MasterPasswordAlreadySetException();
    }

    if (masterPassword.length() < MIN_MASTER_PASSWORD_LENGTH) {
      throw new InvalidVaultRequestException("Master password must be at least " + MIN_MASTER_PASSWORD_LENGTH + " characters");
    }

    String salt = encryptionService.generateSalt();

    vaultMasterPasswordRepository.save(
        VaultMasterPassword.builder()
            .userId(userId)
            .passwordHash(passwordEncoder.encode(masterPassword))
            .salt(salt)
            .kdfIterations(EncryptionService.CURRENT_ITERATIONS)
            .strength(passwordStrengthService.score(masterPassword).name())
            .build());
  }

  public void verify(UUID userId, String masterPassword) {
    attemptLimiter.checkAllowed(userId);
    VaultMasterPassword vaultMasterPassword =
        vaultMasterPasswordRepository
            .findByUserId(userId)
            .orElseThrow(InvalidMasterPasswordException::new);

    if (!passwordEncoder.matches(masterPassword, vaultMasterPassword.getPasswordHash())) {
      attemptLimiter.recordFailure(userId);
      throw new InvalidMasterPasswordException();
    }
    attemptLimiter.recordSuccess(userId);

    SecretKey key =
        encryptionService.deriveKey(masterPassword, vaultMasterPassword.getSalt(), vaultMasterPassword.effectiveKdfIterations());

    vaultKeyStore.save(
        userId, new VaultKeyRecord(key, Instant.now().plusSeconds(VAULT_UNLOCK_DURATION_SECONDS)));
  }

  @Transactional(readOnly = true)
  public VaultStatusResponse getStatus(UUID userId) {
    var vaultMasterPassword = vaultMasterPasswordRepository.findByUserId(userId).orElse(null);

    return VaultStatusResponse.builder()
        .hasMasterPassword(vaultMasterPassword != null)
        .unlocked(vaultKeyStore.get(userId) != null)
        .masterPasswordStrength(
            vaultMasterPassword != null ? vaultMasterPassword.getStrength() : null)
        .masterPasswordUpdatedAt(
            vaultMasterPassword != null ? vaultMasterPassword.getUpdatedAt() : null)
        .build();
  }

  @Transactional
  public void changePassword(UUID userId, String currentPassword, String newPassword) {
    attemptLimiter.checkAllowed(userId);
    VaultMasterPassword existingMasterPassword =
        vaultMasterPasswordRepository
            .findByUserId(userId)
            .orElseThrow(InvalidMasterPasswordException::new);

    if (!passwordEncoder.matches(currentPassword, existingMasterPassword.getPasswordHash())) {
      attemptLimiter.recordFailure(userId);
      throw new InvalidMasterPasswordException();
    }
    attemptLimiter.recordSuccess(userId);

    SecretKey oldKey =
        encryptionService.deriveKey(currentPassword, existingMasterPassword.getSalt(), existingMasterPassword.effectiveKdfIterations());

    String newSalt = encryptionService.generateSalt();
    SecretKey newKey = encryptionService.deriveKey(newPassword, newSalt, EncryptionService.CURRENT_ITERATIONS);

    List<VaultEntry> entries = vaultEntryRepository.findAllByUserId(userId);

    for (VaultEntry entry : entries) {
      if (entry.getPasswordEncrypted() != null) {
        String plainText =
            encryptionService.decrypt(entry.getPasswordEncrypted(), entry.getPasswordIv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        entry.setPasswordEncrypted(newEnc.ciphertext());
        entry.setPasswordIv(newEnc.iv());
      }

      if (entry.getNotesEncrypted() != null) {
        String plainText =
            encryptionService.decrypt(entry.getNotesEncrypted(), entry.getNotesIv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        entry.setNotesEncrypted(newEnc.ciphertext());
        entry.setNotesIv(newEnc.iv());
      }
    }

    vaultEntryRepository.saveAll(entries);

    List<PaymentCard> cards = paymentCardRepository.findAllByUserId(userId);

    for (PaymentCard card : cards) {
      if (card.getCardNumberEncrypted() != null) {
        String plainText =
            encryptionService.decrypt(
                card.getCardNumberEncrypted(), card.getCardNumberIv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        card.setCardNumberEncrypted(newEnc.ciphertext());
        card.setCardNumberIv(newEnc.iv());
      }

      if (card.getCvvEncrypted() != null) {
        String plainText =
            encryptionService.decrypt(card.getCvvEncrypted(), card.getCvvIv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        card.setCvvEncrypted(newEnc.ciphertext());
        card.setCvvIv(newEnc.iv());
      }

      if (card.getExpiryEncrypted() != null) {
        String plainText =
            encryptionService.decrypt(card.getExpiryEncrypted(), card.getExpiryIv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        card.setExpiryEncrypted(newEnc.ciphertext());
        card.setExpiryIv(newEnc.iv());
      }

      if (card.getPasswordEncrypted() != null) {
        String plainText =
            encryptionService.decrypt(card.getPasswordEncrypted(), card.getPasswordIv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        card.setPasswordEncrypted(newEnc.ciphertext());
        card.setPasswordIv(newEnc.iv());
      }
    }

    paymentCardRepository.saveAll(cards);

    existingMasterPassword.setPasswordHash(passwordEncoder.encode(newPassword));
    existingMasterPassword.setSalt(newSalt);
    existingMasterPassword.setKdfIterations(EncryptionService.CURRENT_ITERATIONS);
    existingMasterPassword.setStrength(passwordStrengthService.score(newPassword).name());

    vaultMasterPasswordRepository.save(existingMasterPassword);

    recoveryCodeRepository.deleteAllByUserId(userId);

    vaultKeyStore.save(
        userId,
        new VaultKeyRecord(newKey, Instant.now().plusSeconds(VAULT_UNLOCK_DURATION_SECONDS)));

    auditEventPublisher.publish(
        userId, AuditEventType.MASTER_PASSWORD_CHANGED, "Master Password Updated", null);

    notificationEventPublisher.publish(
        userId,
        NotificationEventType.VAULT_MASTER_PASSWORD_CHANGED,
        "Vault master password changed",
        "Your vault master password was changed. If this wasn't you, secure your account immediately.");
  }
}
