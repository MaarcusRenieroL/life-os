package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.response.RecoveryCodeStatusResponse;
import com.lifeos.vault.domains.entity.PaymentCard;
import com.lifeos.vault.domains.entity.RecoveryCode;
import com.lifeos.vault.domains.entity.VaultEntry;
import com.lifeos.vault.domains.entity.VaultMasterPassword;
import com.lifeos.vault.exception.InvalidMasterPasswordException;
import com.lifeos.vault.exception.InvalidRecoveryCodeException;
import com.lifeos.vault.repository.PaymentCardRepository;
import com.lifeos.vault.repository.RecoveryCodeRepository;
import com.lifeos.vault.repository.VaultEntryRepository;
import com.lifeos.vault.repository.VaultMasterPasswordRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RecoveryCodeService {

  private static final int CODE_COUNT = 10;

  private static final String CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  private static final SecureRandom SECURE_RANDOM = new SecureRandom();

  private final RecoveryCodeRepository recoveryCodeRepository;
  private final VaultMasterPasswordRepository vaultMasterPasswordRepository;
  private final VaultEntryRepository vaultEntryRepository;
  private final PaymentCardRepository paymentCardRepository;
  private final PasswordEncoder passwordEncoder;
  private final EncryptionService encryptionService;

  @Transactional
  public List<String> generate(UUID userId, String currentPassword) {
    VaultMasterPassword vaultMasterPassword =
        vaultMasterPasswordRepository
            .findByUserId(userId)
            .orElseThrow(InvalidMasterPasswordException::new);

    if (!passwordEncoder.matches(currentPassword, vaultMasterPassword.getPasswordHash())) {
      throw new InvalidMasterPasswordException();
    }

    recoveryCodeRepository.deleteAllByUserId(userId);

    // Same key vault entries/cards are currently encrypted with - each code below gets
    // its own sealed copy of this exact key, wrapped under a key derived from that code.
    SecretKey vaultKey =
        encryptionService.deriveKey(currentPassword, vaultMasterPassword.getSalt());
    String vaultKeyBase64 = Base64.getEncoder().encodeToString(vaultKey.getEncoded());

    List<String> plainTextCodes = new ArrayList<>();
    List<RecoveryCode> recoveryCodes = new ArrayList<>();

    for (int i = 0; i < CODE_COUNT; i++) {
      String code = generateSingleCode();

      plainTextCodes.add(code);

      String keySalt = encryptionService.generateSalt();
      SecretKey codeWrappingKey = encryptionService.deriveKey(code, keySalt);
      var wrappedKey = encryptionService.encrypt(vaultKeyBase64, codeWrappingKey);

      recoveryCodes.add(
          RecoveryCode.builder()
              .used(false)
              .usedAt(null)
              .userId(userId)
              .codeHash(passwordEncoder.encode(code))
              .keySalt(keySalt)
              .wrappedKeyCiphertext(wrappedKey.ciphertext())
              .wrappedKeyIv(wrappedKey.iv())
              .build());
    }

    recoveryCodeRepository.saveAll(recoveryCodes);

    return plainTextCodes;
  }

  public List<RecoveryCodeStatusResponse> listStatus(UUID userId) {
    List<RecoveryCode> recoveryCodes =
        recoveryCodeRepository.findAllByUserIdOrderByCreatedAtAsc(userId);

    return recoveryCodes.stream().map(this::toResponse).toList();
  }

  @Transactional
  public void redeem(UUID userId, String code) {
    List<RecoveryCode> recoveryCodes = recoveryCodeRepository.findAllByUserIdAndUsedFalse(userId);

    for (RecoveryCode recoveryCode : recoveryCodes) {
      if (passwordEncoder.matches(code, recoveryCode.getCodeHash())) {
        recoveryCode.setUsed(true);
        recoveryCode.setUsedAt(Instant.now());

        recoveryCodeRepository.save(recoveryCode);

        return;
      }
    }

    throw new InvalidRecoveryCodeException();
  }

  @Transactional
  public void resetWithCode(UUID userId, String code, String newMasterPassword) {
    List<RecoveryCode> unusedRecoveryCodes =
        recoveryCodeRepository.findAllByUserIdAndUsedFalse(userId);

    for (RecoveryCode recoveryCode : unusedRecoveryCodes) {
      if (passwordEncoder.matches(code, recoveryCode.getCodeHash())) {
        SecretKey codeWrappingKey = encryptionService.deriveKey(code, recoveryCode.getKeySalt());
        String vaultKeyAsBase64 =
            encryptionService.decrypt(
                recoveryCode.getWrappedKeyCiphertext(),
                recoveryCode.getWrappedKeyIv(),
                codeWrappingKey);
        byte[] vaultKeyBytes = Base64.getDecoder().decode(vaultKeyAsBase64);

        SecretKey oldVaultKey = new SecretKeySpec(vaultKeyBytes, "AES");

        VaultMasterPassword vaultMasterPassword =
            vaultMasterPasswordRepository
                .findByUserId(userId)
                .orElseThrow(InvalidRecoveryCodeException::new);

        String newSalt = encryptionService.generateSalt();
        SecretKey newKey = encryptionService.deriveKey(newMasterPassword, newSalt);

        List<VaultEntry> entries = vaultEntryRepository.findAllByUserId(userId);

        for (VaultEntry entry : entries) {
          if (entry.getPasswordEncrypted() != null) {
            String password =
                encryptionService.decrypt(
                    entry.getPasswordEncrypted(), entry.getPasswordIv(), oldVaultKey);

            var encPassword = encryptionService.encrypt(password, newKey);

            entry.setPasswordEncrypted(encPassword.ciphertext());
            entry.setPasswordIv(encPassword.iv());
          }

          if (entry.getNotesEncrypted() != null) {
            String notes =
                encryptionService.decrypt(
                    entry.getNotesEncrypted(), entry.getNotesIv(), oldVaultKey);

            var encNotes = encryptionService.encrypt(notes, newKey);

            entry.setNotesEncrypted(encNotes.ciphertext());
            entry.setNotesIv(encNotes.iv());
          }
        }

        vaultEntryRepository.saveAll(entries);

        List<PaymentCard> cards = paymentCardRepository.findAllByUserId(userId);

        for (PaymentCard card : cards) {
          if (card.getCardNumberEncrypted() != null) {
            String cardNumber =
                encryptionService.decrypt(
                    card.getCardNumberEncrypted(), card.getCardNumberIvv(), oldVaultKey);

            var encCardNumber = encryptionService.encrypt(cardNumber, newKey);

            card.setCardNumberEncrypted(encCardNumber.ciphertext());
            card.setCardNumberIvv(encCardNumber.iv());
          }

          if (card.getCvvEncrypted() != null) {
            String cvv =
                encryptionService.decrypt(card.getCvvEncrypted(), card.getCvvIvv(), oldVaultKey);

            var encCvv = encryptionService.encrypt(cvv, newKey);

            card.setCvvEncrypted(encCvv.ciphertext());
            card.setCvvIvv(encCvv.iv());
          }

          if (card.getExpiryEncrypted() != null) {
            String expiry =
                encryptionService.decrypt(
                    card.getExpiryEncrypted(), card.getExpiryIvv(), oldVaultKey);

            var encExpiry = encryptionService.encrypt(expiry, newKey);

            card.setExpiryEncrypted(encExpiry.ciphertext());
            card.setExpiryIvv(encExpiry.iv());
          }

          if (card.getPasswordEncrypted() != null) {
            String password =
                encryptionService.decrypt(
                    card.getPasswordEncrypted(), card.getPasswordIvv(), oldVaultKey);

            var encPassword = encryptionService.encrypt(password, newKey);

            card.setPasswordEncrypted(encPassword.ciphertext());
            card.setPasswordIvv(encPassword.iv());
          }
        }

        paymentCardRepository.saveAll(cards);

        vaultMasterPassword.setPasswordHash(passwordEncoder.encode(newMasterPassword));
        vaultMasterPassword.setSalt(newSalt);

        vaultMasterPasswordRepository.save(vaultMasterPassword);

        // Every code in this batch (including the one just redeemed) wraps the old
        // vault key, which no longer matches the newly re-encrypted data - all of them
        // are invalidated here rather than only marking this one used.
        recoveryCodeRepository.deleteAllByUserId(userId);

        return;
      }
    }

    throw new InvalidRecoveryCodeException();
  }

  private RecoveryCodeStatusResponse toResponse(RecoveryCode code) {
    return RecoveryCodeStatusResponse.builder()
        .id(code.getId())
        .used(code.isUsed())
        .usedAt(code.getUsedAt())
        .createdAt(code.getCreatedAt())
        .build();
  }

  private String generateSingleCode() {
    Supplier<String> makeBlock =
        () -> {
          StringBuilder block = new StringBuilder();
          for (int i = 0; i < 4; i++) {
            block.append(CODE_ALPHABET.charAt(SECURE_RANDOM.nextInt(CODE_ALPHABET.length())));
          }
          return block.toString();
        };

    return String.join("-", makeBlock.get(), makeBlock.get(), makeBlock.get());
  }
}
