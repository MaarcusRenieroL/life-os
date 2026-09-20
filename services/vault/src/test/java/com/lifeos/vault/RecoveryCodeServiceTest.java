package com.lifeos.vault;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.AuditEventPublisher;
import com.lifeos.common.events.AuditEventType;
import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
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
import com.lifeos.vault.service.EncryptionService;
import com.lifeos.vault.service.EncryptionService.EncryptedData;
import com.lifeos.vault.service.PasswordStrengthService;
import com.lifeos.vault.service.PasswordStrengthService.Strength;
import com.lifeos.vault.service.RecoveryCodeService;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class RecoveryCodeServiceTest {

  @Mock private RecoveryCodeRepository recoveryCodeRepository;
  @Mock private VaultMasterPasswordRepository vaultMasterPasswordRepository;
  @Mock private VaultEntryRepository vaultEntryRepository;
  @Mock private PaymentCardRepository paymentCardRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private EncryptionService encryptionService;
  @Mock private PasswordStrengthService passwordStrengthService;
  @Mock private AuditEventPublisher auditEventPublisher;
  @Mock private NotificationEventPublisher notificationEventPublisher;

  @InjectMocks private RecoveryCodeService recoveryCodeService;

  private final UUID userId = UUID.randomUUID();

  private static final Pattern CODE_PATTERN =
      Pattern.compile("^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$");

  @Test
  void generateThrowsWhenNoMasterPasswordIsSetUp() {
    when(vaultMasterPasswordRepository.findByUserId(userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> recoveryCodeService.generate(userId, "whatever"))
        .isInstanceOf(InvalidMasterPasswordException.class);

    verify(recoveryCodeRepository, never()).deleteAllByUserId(any());
    verify(recoveryCodeRepository, never()).saveAll(any());
  }

  @Test
  void generateThrowsWhenCurrentPasswordDoesNotMatch() {
    VaultMasterPassword vmp =
        VaultMasterPassword.builder().userId(userId).passwordHash("hash").salt("salt").build();
    when(vaultMasterPasswordRepository.findByUserId(userId)).thenReturn(Optional.of(vmp));
    when(passwordEncoder.matches("wrong-password", "hash")).thenReturn(false);

    assertThatThrownBy(() -> recoveryCodeService.generate(userId, "wrong-password"))
        .isInstanceOf(InvalidMasterPasswordException.class);

    verify(recoveryCodeRepository, never()).saveAll(any());
  }

  @Test
  void generateProducesTenHashedSingleUseCodesAndReplacesOldOnes() {
    VaultMasterPassword vmp =
        VaultMasterPassword.builder().userId(userId).passwordHash("hash").salt("salt").build();
    when(vaultMasterPasswordRepository.findByUserId(userId)).thenReturn(Optional.of(vmp));
    when(passwordEncoder.matches("correct-password", "hash")).thenReturn(true);

    SecretKey vaultKey = mock(SecretKey.class);
    when(vaultKey.getEncoded()).thenReturn(new byte[] {1, 2, 3, 4});
    when(encryptionService.deriveKey("correct-password", "salt")).thenReturn(vaultKey);

    when(encryptionService.generateSalt()).thenReturn("keySalt");
    when(encryptionService.deriveKey(anyString(), eq("keySalt")))
        .thenReturn(mock(SecretKey.class));
    when(encryptionService.encrypt(anyString(), any(SecretKey.class)))
        .thenReturn(new EncryptedData("wrappedCt", "wrappedIv"));
    // Hash prefix proves the stored value is a hash of the code, not the code itself.
    when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "hashed:" + inv.getArgument(0));

    List<String> plainTextCodes = recoveryCodeService.generate(userId, "correct-password");

    assertThat(plainTextCodes).hasSize(10);
    plainTextCodes.forEach(code -> assertThat(code).matches(CODE_PATTERN));
    // Every returned code is unique.
    assertThat(plainTextCodes).doesNotHaveDuplicates();

    verify(recoveryCodeRepository).deleteAllByUserId(userId);

    ArgumentCaptor<List<RecoveryCode>> captor = ArgumentCaptor.forClass(List.class);
    verify(recoveryCodeRepository).saveAll(captor.capture());
    List<RecoveryCode> persisted = captor.getValue();

    assertThat(persisted).hasSize(10);
    for (int i = 0; i < persisted.size(); i++) {
      RecoveryCode recoveryCode = persisted.get(i);
      String plainCode = plainTextCodes.get(i);

      assertThat(recoveryCode.isUsed()).isFalse();
      assertThat(recoveryCode.getUserId()).isEqualTo(userId);
      assertThat(recoveryCode.getCodeHash()).isEqualTo("hashed:" + plainCode);
      // The plaintext code itself must never be persisted anywhere on the entity.
      assertThat(recoveryCode.getCodeHash()).isNotEqualTo(plainCode);
    }

    verify(auditEventPublisher)
        .publish(eq(userId), eq(AuditEventType.RECOVERY_CODE_GENERATED), anyString(), eq(null));
  }

  @Test
  void redeemValidUnusedCodeSucceedsAndMarksItUsed() {
    RecoveryCode storedCode =
        RecoveryCode.builder().id(UUID.randomUUID()).userId(userId).codeHash("h1").used(false).build();
    when(recoveryCodeRepository.findAllByUserIdAndUsedFalse(userId))
        .thenReturn(List.of(storedCode));
    when(passwordEncoder.matches("ABCD-EFGH-JKLM", "h1")).thenReturn(true);

    recoveryCodeService.redeem(userId, "ABCD-EFGH-JKLM");

    ArgumentCaptor<RecoveryCode> captor = ArgumentCaptor.forClass(RecoveryCode.class);
    verify(recoveryCodeRepository).save(captor.capture());
    assertThat(captor.getValue().isUsed()).isTrue();
    assertThat(captor.getValue().getUsedAt()).isNotNull();

    verify(auditEventPublisher)
        .publish(eq(userId), eq(AuditEventType.RECOVERY_CODE_REDEEMED), anyString(), eq(null));
    verify(notificationEventPublisher)
        .publish(eq(userId), eq(NotificationEventType.VAULT_RECOVERY_CODE_USED), anyString(), anyString());
  }

  @Test
  void redeemingTheSameCodeTwiceFailsOnTheSecondAttempt() {
    RecoveryCode storedCode =
        RecoveryCode.builder().id(UUID.randomUUID()).userId(userId).codeHash("h1").used(false).build();
    // First call: the code is still in the unused set. Second call: since redeem()
    // flips `used` to true and persists it, a fresh query for unused codes no
    // longer includes it - simulating real repository behaviour across calls.
    when(recoveryCodeRepository.findAllByUserIdAndUsedFalse(userId))
        .thenReturn(List.of(storedCode))
        .thenReturn(List.of());
    when(passwordEncoder.matches("ABCD-EFGH-JKLM", "h1")).thenReturn(true);

    recoveryCodeService.redeem(userId, "ABCD-EFGH-JKLM");

    assertThatThrownBy(() -> recoveryCodeService.redeem(userId, "ABCD-EFGH-JKLM"))
        .isInstanceOf(InvalidRecoveryCodeException.class);
  }

  @Test
  void redeemUnknownCodeThrowsAndNeverSaves() {
    RecoveryCode storedCode =
        RecoveryCode.builder().id(UUID.randomUUID()).userId(userId).codeHash("h1").used(false).build();
    when(recoveryCodeRepository.findAllByUserIdAndUsedFalse(userId))
        .thenReturn(List.of(storedCode));
    when(passwordEncoder.matches(anyString(), eq("h1"))).thenReturn(false);

    assertThatThrownBy(() -> recoveryCodeService.redeem(userId, "NOPE-NOPE-NOPE"))
        .isInstanceOf(InvalidRecoveryCodeException.class);

    verify(recoveryCodeRepository, never()).save(any());
  }

  @Test
  void resetWithCodeThrowsForAnInvalidCodeAndChangesNothing() {
    RecoveryCode storedCode =
        RecoveryCode.builder().id(UUID.randomUUID()).userId(userId).codeHash("h1").used(false).build();
    when(recoveryCodeRepository.findAllByUserIdAndUsedFalse(userId))
        .thenReturn(List.of(storedCode));
    when(passwordEncoder.matches(anyString(), eq("h1"))).thenReturn(false);

    assertThatThrownBy(() -> recoveryCodeService.resetWithCode(userId, "NOPE-NOPE-NOPE", "newPass"))
        .isInstanceOf(InvalidRecoveryCodeException.class);

    verify(vaultMasterPasswordRepository, never()).save(any());
    verify(recoveryCodeRepository, never()).deleteAllByUserId(any());
  }

  @Test
  void resetWithCodeUnwrapsVaultKeyReEncryptsAllDataAndRotatesMasterPassword() {
    String code = "ABCD-EFGH-JKLM";
    String vaultKeyBase64 = Base64.getEncoder().encodeToString(new byte[32]);

    RecoveryCode storedCode =
        RecoveryCode.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .codeHash("h1")
            .used(false)
            .keySalt("codeSalt")
            .wrappedKeyCiphertext("wrappedCt")
            .wrappedKeyIv("wrappedIv")
            .build();
    when(recoveryCodeRepository.findAllByUserIdAndUsedFalse(userId))
        .thenReturn(List.of(storedCode));
    when(passwordEncoder.matches(code, "h1")).thenReturn(true);

    SecretKey codeWrappingKey = mock(SecretKey.class);
    when(encryptionService.deriveKey(code, "codeSalt")).thenReturn(codeWrappingKey);
    when(encryptionService.decrypt("wrappedCt", "wrappedIv", codeWrappingKey))
        .thenReturn(vaultKeyBase64);

    VaultMasterPassword vmp = VaultMasterPassword.builder().userId(userId).build();
    when(vaultMasterPasswordRepository.findByUserId(userId)).thenReturn(Optional.of(vmp));

    when(encryptionService.generateSalt()).thenReturn("newSalt");
    SecretKey newKey = mock(SecretKey.class);
    when(encryptionService.deriveKey("newMasterPassword", "newSalt")).thenReturn(newKey);

    VaultEntry entry =
        VaultEntry.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .passwordEncrypted("oldPwdCt")
            .passwordIv("oldPwdIv")
            .notesEncrypted("oldNotesCt")
            .notesIv("oldNotesIv")
            .build();
    when(vaultEntryRepository.findAllByUserId(userId)).thenReturn(List.of(entry));
    when(encryptionService.decrypt(eq("oldPwdCt"), eq("oldPwdIv"), any()))
        .thenReturn("plainEntryPassword");
    when(encryptionService.decrypt(eq("oldNotesCt"), eq("oldNotesIv"), any()))
        .thenReturn("plainEntryNotes");
    when(encryptionService.encrypt(eq("plainEntryPassword"), eq(newKey)))
        .thenReturn(new EncryptedData("newPwdCt", "newPwdIv"));
    when(encryptionService.encrypt(eq("plainEntryNotes"), eq(newKey)))
        .thenReturn(new EncryptedData("newNotesCt", "newNotesIv"));

    PaymentCard card =
        PaymentCard.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .cardNumberEncrypted("oldNumCt")
            .cardNumberIv("oldNumIv")
            .cvvEncrypted("oldCvvCt")
            .cvvIv("oldCvvIv")
            .expiryEncrypted("oldExpCt")
            .expiryIv("oldExpIv")
            .build();
    when(paymentCardRepository.findAllByUserId(userId)).thenReturn(List.of(card));
    when(encryptionService.decrypt(eq("oldNumCt"), eq("oldNumIv"), any()))
        .thenReturn("4111111111111111");
    when(encryptionService.decrypt(eq("oldCvvCt"), eq("oldCvvIv"), any())).thenReturn("123");
    when(encryptionService.decrypt(eq("oldExpCt"), eq("oldExpIv"), any())).thenReturn("09/28");
    when(encryptionService.encrypt(eq("4111111111111111"), eq(newKey)))
        .thenReturn(new EncryptedData("newNumCt", "newNumIv"));
    when(encryptionService.encrypt(eq("123"), eq(newKey)))
        .thenReturn(new EncryptedData("newCvvCt", "newCvvIv"));
    when(encryptionService.encrypt(eq("09/28"), eq(newKey)))
        .thenReturn(new EncryptedData("newExpCt", "newExpIv"));

    when(passwordEncoder.encode("newMasterPassword")).thenReturn("newHash");
    when(passwordStrengthService.score("newMasterPassword")).thenReturn(Strength.STRONG);

    recoveryCodeService.resetWithCode(userId, code, "newMasterPassword");

    assertThat(entry.getPasswordEncrypted()).isEqualTo("newPwdCt");
    assertThat(entry.getNotesEncrypted()).isEqualTo("newNotesCt");
    assertThat(card.getCardNumberEncrypted()).isEqualTo("newNumCt");
    assertThat(card.getCvvEncrypted()).isEqualTo("newCvvCt");
    assertThat(card.getExpiryEncrypted()).isEqualTo("newExpCt");

    verify(vaultEntryRepository).saveAll(List.of(entry));
    verify(paymentCardRepository).saveAll(List.of(card));

    ArgumentCaptor<VaultMasterPassword> vmpCaptor =
        ArgumentCaptor.forClass(VaultMasterPassword.class);
    verify(vaultMasterPasswordRepository).save(vmpCaptor.capture());
    assertThat(vmpCaptor.getValue().getPasswordHash()).isEqualTo("newHash");
    assertThat(vmpCaptor.getValue().getSalt()).isEqualTo("newSalt");
    assertThat(vmpCaptor.getValue().getStrength()).isEqualTo("STRONG");

    verify(recoveryCodeRepository).deleteAllByUserId(userId);
    verify(auditEventPublisher)
        .publish(eq(userId), eq(AuditEventType.RECOVERY_CODE_RESET), anyString(), eq(null));
    verify(notificationEventPublisher)
        .publish(eq(userId), eq(NotificationEventType.VAULT_RECOVERY_CODE_USED), anyString(), anyString());
    verify(notificationEventPublisher)
        .publish(eq(userId), eq(NotificationEventType.VAULT_MASTER_PASSWORD_CHANGED), anyString(), anyString());
  }
}
