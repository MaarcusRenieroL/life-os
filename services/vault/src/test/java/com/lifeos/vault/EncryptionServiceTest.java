package com.lifeos.vault;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.lifeos.vault.service.EncryptionService;
import com.lifeos.vault.service.EncryptionService.EncryptedData;
import java.util.Base64;
import java.util.HashSet;
import java.util.Set;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;

class EncryptionServiceTest {

  private final EncryptionService encryptionService = new EncryptionService();

  @Test
  void deriveKeySameInputsProduceSameKey() {
    String salt = encryptionService.generateSalt();

    SecretKey keyOne = encryptionService.deriveKey("correct-horse-battery", salt);
    SecretKey keyTwo = encryptionService.deriveKey("correct-horse-battery", salt);

    assertThat(keyOne.getEncoded()).isEqualTo(keyTwo.getEncoded());
  }

  @Test
  void deriveKeyDifferentPasswordsProduceDifferentKeys() {
    String salt = encryptionService.generateSalt();

    SecretKey keyOne = encryptionService.deriveKey("correct-horse-battery", salt);
    SecretKey keyTwo = encryptionService.deriveKey("wrong-horse-battery", salt);

    assertThat(keyOne.getEncoded()).isNotEqualTo(keyTwo.getEncoded());
  }

  @Test
  void deriveKeyDifferentSaltsProduceDifferentKeysForSamePassword() {
    String saltOne = encryptionService.generateSalt();
    String saltTwo = encryptionService.generateSalt();

    SecretKey keyOne = encryptionService.deriveKey("same-password", saltOne);
    SecretKey keyTwo = encryptionService.deriveKey("same-password", saltTwo);

    assertThat(keyOne.getEncoded()).isNotEqualTo(keyTwo.getEncoded());
  }

  @Test
  void generateSaltProducesDistinctValuesAcrossCalls() {
    Set<String> salts = new HashSet<>();
    for (int i = 0; i < 20; i++) {
      salts.add(encryptionService.generateSalt());
    }

    assertThat(salts).hasSize(20);
  }

  @Test
  void generateSaltProducesSixteenRawBytes() {
    String salt = encryptionService.generateSalt();

    assertThat(Base64.getDecoder().decode(salt)).hasSize(16);
  }

  @Test
  void encryptThenDecryptWithSameKeyRecoversOriginalPlaintext() {
    SecretKey key = encryptionService.deriveKey("master-password", encryptionService.generateSalt());
    String plaintext = "4111111111111111";

    EncryptedData encrypted = encryptionService.encrypt(plaintext, key);
    String decrypted = encryptionService.decrypt(encrypted.ciphertext(), encrypted.iv(), key);

    assertThat(decrypted).isEqualTo(plaintext);
  }

  @Test
  void encryptProducesDifferentCiphertextAndIvOnEachCallDueToRandomIv() {
    SecretKey key = encryptionService.deriveKey("master-password", encryptionService.generateSalt());
    String plaintext = "same plaintext every time";

    EncryptedData first = encryptionService.encrypt(plaintext, key);
    EncryptedData second = encryptionService.encrypt(plaintext, key);

    assertThat(first.iv()).isNotEqualTo(second.iv());
    assertThat(first.ciphertext()).isNotEqualTo(second.ciphertext());
  }

  @Test
  void decryptWithKeyDerivedFromWrongPasswordThrows() {
    String salt = encryptionService.generateSalt();
    SecretKey correctKey = encryptionService.deriveKey("correct-password", salt);
    SecretKey wrongKey = encryptionService.deriveKey("wrong-password", salt);

    EncryptedData encrypted = encryptionService.encrypt("top secret notes", correctKey);

    assertThatThrownBy(
            () -> encryptionService.decrypt(encrypted.ciphertext(), encrypted.iv(), wrongKey))
        .isInstanceOf(RuntimeException.class);
  }

  @Test
  void decryptWithKeyDerivedFromWrongSaltThrows() {
    SecretKey correctKey = encryptionService.deriveKey("same-password", encryptionService.generateSalt());
    SecretKey wrongSaltKey =
        encryptionService.deriveKey("same-password", encryptionService.generateSalt());

    EncryptedData encrypted = encryptionService.encrypt("top secret notes", correctKey);

    assertThatThrownBy(
            () -> encryptionService.decrypt(encrypted.ciphertext(), encrypted.iv(), wrongSaltKey))
        .isInstanceOf(RuntimeException.class);
  }

  @Test
  void decryptWithTamperedCiphertextThrowsDueToGcmAuthentication() {
    SecretKey key = encryptionService.deriveKey("master-password", encryptionService.generateSalt());
    EncryptedData encrypted = encryptionService.encrypt("authenticate me please", key);

    byte[] tampered = Base64.getDecoder().decode(encrypted.ciphertext());
    tampered[0] ^= (byte) 0xFF;
    String tamperedCiphertext = Base64.getEncoder().encodeToString(tampered);

    assertThatThrownBy(() -> encryptionService.decrypt(tamperedCiphertext, encrypted.iv(), key))
        .isInstanceOf(RuntimeException.class);
  }
}
