package com.lifeos.vault.service;

import java.nio.charset.StandardCharsets;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class EncryptionService {

  /** What every master password used before the iteration count was stored. Still read for existing vaults. */
  public static final int LEGACY_ITERATIONS = 65536;
  /** Used for every new or changed master password (OWASP guidance for PBKDF2-HMAC-SHA256). */
  public static final int CURRENT_ITERATIONS = 600_000;
  private static final int KEY_LENGTH_BITS = 256;
  private static final int GCM_IV_LENGTH_BYTES = 12;
  private static final int GCM_TAG_LENGTH_BITS = 128;

  public SecretKey deriveKey(String masterPassword, String saltBase64) {
    return deriveKey(masterPassword, saltBase64, LEGACY_ITERATIONS);
  }

  public SecretKey deriveKey(String masterPassword, String saltBase64, int iterations) {
    try {
      byte[] salt = Base64.getDecoder().decode(saltBase64);

      PBEKeySpec spec =
          new PBEKeySpec(masterPassword.toCharArray(), salt, iterations, KEY_LENGTH_BITS);
      SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");

      byte[] keyBytes = factory.generateSecret(spec).getEncoded();
      return new SecretKeySpec(keyBytes, "AES");
    } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
      throw new RuntimeException(e);
    }
  }

  public String generateSalt() {
    byte[] salt = new byte[16];
    new SecureRandom().nextBytes(salt);
    return Base64.getEncoder().encodeToString(salt);
  }

  public EncryptedData encrypt(String plaintext, SecretKey key) {
    try {
      byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
      new SecureRandom().nextBytes(iv);

      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

      byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

      return new EncryptedData(
          Base64.getEncoder().encodeToString(ciphertext), Base64.getEncoder().encodeToString(iv));
    } catch (Exception e) {
      throw new RuntimeException("Failed to encrypt vault entry", e);
    }
  }

  public String decrypt(String ciphertextBase64, String ivBase64, SecretKey key) {
    try {
      byte[] iv = Base64.getDecoder().decode(ivBase64);
      byte[] ciphertext = Base64.getDecoder().decode(ciphertextBase64);

      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

      byte[] plaintext = cipher.doFinal(ciphertext);
      return new String(plaintext, StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new RuntimeException("Failed to decrypt vault entry", e);
    }
  }

  public record EncryptedData(String ciphertext, String iv) {}
}
