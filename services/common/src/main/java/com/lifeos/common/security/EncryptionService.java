package com.lifeos.common.security;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// Single server-side secret, no per-user unlock concept (unlike vault's
// EncryptionService, which derives a key from an unlocked master password).
// Shared across services that need to encrypt a value at rest without a
// master-password model - each service just binds its own env var to the
// generic "encryption.secret" property in its application.yaml. IV is stored
// alongside the ciphertext in one string ("iv:ciphertext", both base64),
// since callers here typically have a single encrypted column, not a
// separate IV column.
@Service
public class EncryptionService {

  private static final int GCM_IV_LENGTH_BYTES = 12;
  private static final int GCM_TAG_LENGTH_BITS = 128;

  private final SecretKey key;

  public EncryptionService(@Value("${encryption.secret}") String secretBase64) {
    this.key = new SecretKeySpec(Base64.getDecoder().decode(secretBase64), "AES");
  }

  public String encrypt(String plaintext) {
    try {
      byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
      new SecureRandom().nextBytes(iv);

      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

      byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

      return Base64.getEncoder().encodeToString(iv)
          + ":"
          + Base64.getEncoder().encodeToString(ciphertext);
    } catch (Exception e) {
      throw new RuntimeException("Failed to encrypt value", e);
    }
  }

  public String decrypt(String stored) {
    try {
      String[] parts = stored.split(":", 2);
      byte[] iv = Base64.getDecoder().decode(parts[0]);
      byte[] ciphertext = Base64.getDecoder().decode(parts[1]);

      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

      byte[] plaintext = cipher.doFinal(ciphertext);

      return new String(plaintext, StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new RuntimeException("Failed to decrypt value", e);
    }
  }
}
