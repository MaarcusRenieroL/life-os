package com.lifeos.app;

import com.lifeos.common.security.EncryptionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Batches (Gmail tokens) and finance (bank account numbers) each encrypt with their own secret, so
 * what is already stored under each keeps decrypting. Inject with the matching {@code @Qualifier}.
 */
@Configuration
public class EncryptionConfig {

  @Bean
  public EncryptionService gmailEncryptionService(@Value("${encryption.gmail-secret}") String secret) {
    return new EncryptionService(secret);
  }

  @Bean
  public EncryptionService financeEncryptionService(@Value("${encryption.finance-secret}") String secret) {
    return new EncryptionService(secret);
  }
}
