package com.lifeos.vault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

// scanBasePackages needed since JwtService/JwtAuthenticationFilter now live in
// com.lifeos.common, outside this app's default com.lifeos.vault scan root.
// common's EncryptionService is excluded: vault has its own, master-password-derived
// EncryptionService (com.lifeos.vault.service.EncryptionService), and both default to the
// same bean name, which fails the context with a ConflictingBeanDefinitionException.
@SpringBootApplication
@ComponentScan(
    basePackages = {"com.lifeos.vault", "com.lifeos.common"},
    excludeFilters =
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = com.lifeos.common.security.EncryptionService.class))
public class VaultApplication {

  public static void main(String[] args) {

    SpringApplication.run(VaultApplication.class, args);
  }
}
