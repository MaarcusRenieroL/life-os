package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.response.VaultStatusResponse;
import com.lifeos.vault.domains.entity.PaymentCard;
import com.lifeos.vault.domains.entity.VaultEntry;
import com.lifeos.vault.domains.entity.VaultMasterPassword;
import com.lifeos.vault.domains.record.VaultKeyRecord;
import com.lifeos.vault.exception.InvalidMasterPasswordException;
import com.lifeos.vault.exception.MasterPasswordAlreadySetException;
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

  private static final long VAULT_UNLOCK_DURATION_SECONDS = 900; // 15 minutes

  private final VaultEntryRepository vaultEntryRepository;
  private final VaultMasterPasswordRepository vaultMasterPasswordRepository;
  private final PaymentCardRepository paymentCardRepository;
  private final RecoveryCodeRepository recoveryCodeRepository;

  private final EncryptionService encryptionService;
  private final PasswordEncoder passwordEncoder;
  private final PasswordStrengthService passwordStrengthService;
  private final VaultKeyStore vaultKeyStore;

  public void setup(UUID userId, String masterPassword) {
    if (vaultMasterPasswordRepository.existsByUserId(userId)) {
      throw new MasterPasswordAlreadySetException();
    }

    String salt = encryptionService.generateSalt();

    vaultMasterPasswordRepository.save(
        VaultMasterPassword.builder()
            .userId(userId)
            .passwordHash(passwordEncoder.encode(masterPassword))
            .salt(salt)
            .strength(passwordStrengthService.score(masterPassword).name())
            .build());
  }

  public void verify(UUID userId, String masterPassword) {
    VaultMasterPassword vaultMasterPassword =
        vaultMasterPasswordRepository
            .findByUserId(userId)
            .orElseThrow(InvalidMasterPasswordException::new);

    if (!passwordEncoder.matches(masterPassword, vaultMasterPassword.getPasswordHash())) {
      throw new InvalidMasterPasswordException();
    }

    SecretKey key = encryptionService.deriveKey(masterPassword, vaultMasterPassword.getSalt());

    vaultKeyStore.save(
        userId, new VaultKeyRecord(key, Instant.now().plusSeconds(VAULT_UNLOCK_DURATION_SECONDS)));
  }

  public VaultStatusResponse getStatus(UUID userId) {
    var vaultMasterPassword = vaultMasterPasswordRepository.findByUserId(userId).orElse(null);

    return VaultStatusResponse.builder()
        .hasMasterPassword(vaultMasterPassword != null)
        .unlocked(vaultKeyStore.get(userId) != null)
        .masterPasswordStrength(vaultMasterPassword != null ? vaultMasterPassword.getStrength() : null)
        .masterPasswordUpdatedAt(vaultMasterPassword != null ? vaultMasterPassword.getUpdatedAt() : null)
        .build();
  }

  @Transactional
  public void changePassword(UUID userId, String currentPassword, String newPassword) {
    VaultMasterPassword existingMasterPassword =
        vaultMasterPasswordRepository
            .findByUserId(userId)
            .orElseThrow(InvalidMasterPasswordException::new);

    if (!passwordEncoder.matches(currentPassword, existingMasterPassword.getPasswordHash())) {
      throw new InvalidMasterPasswordException();
    }

    SecretKey oldKey =
        encryptionService.deriveKey(currentPassword, existingMasterPassword.getSalt());

    String newSalt = encryptionService.generateSalt();
    SecretKey newKey = encryptionService.deriveKey(newPassword, newSalt);

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
      // Each field re-encrypted independently, not one all-or-nothing check -
      // passwordEncrypted in particular is never actually set by CreateCardRequest
      // today, so requiring it to be non-null would skip every real card.
      if (card.getCardNumberEncrypted() != null) {
        String plainText =
            encryptionService.decrypt(card.getCardNumberEncrypted(), card.getCardNumberIvv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        card.setCardNumberEncrypted(newEnc.ciphertext());
        card.setCardNumberIvv(newEnc.iv());
      }

      if (card.getCvvEncrypted() != null) {
        String plainText = encryptionService.decrypt(card.getCvvEncrypted(), card.getCvvIvv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        card.setCvvEncrypted(newEnc.ciphertext());
        card.setCvvIvv(newEnc.iv());
      }

      if (card.getExpiryEncrypted() != null) {
        String plainText =
            encryptionService.decrypt(card.getExpiryEncrypted(), card.getExpiryIvv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        card.setExpiryEncrypted(newEnc.ciphertext());
        card.setExpiryIvv(newEnc.iv());
      }

      if (card.getPasswordEncrypted() != null) {
        String plainText =
            encryptionService.decrypt(card.getPasswordEncrypted(), card.getPasswordIvv(), oldKey);

        var newEnc = encryptionService.encrypt(plainText, newKey);

        card.setPasswordEncrypted(newEnc.ciphertext());
        card.setPasswordIvv(newEnc.iv());
      }
    }

    paymentCardRepository.saveAll(cards);

    existingMasterPassword.setPasswordHash(passwordEncoder.encode(newPassword));
    existingMasterPassword.setSalt(newSalt);
    existingMasterPassword.setStrength(passwordStrengthService.score(newPassword).name());

    vaultMasterPasswordRepository.save(existingMasterPassword);

    // Every outstanding recovery code wraps the now-stale old vault key - redeeming one
    // after this point would silently recover a key that can't decrypt current data, so
    // they're invalidated rather than left to fail confusingly later.
    recoveryCodeRepository.deleteAllByUserId(userId);

    // Re-unlock with the new key so the user isn't immediately prompted to
    // unlock again right after changing their password.
    vaultKeyStore.save(
        userId, new VaultKeyRecord(newKey, Instant.now().plusSeconds(VAULT_UNLOCK_DURATION_SECONDS)));
  }
}
