package com.lifeos.vault.service;

import com.lifeos.vault.repository.PaymentCardRepository;
import com.lifeos.vault.repository.RecoveryCodeRepository;
import com.lifeos.vault.repository.VaultCategoryRepository;
import com.lifeos.vault.repository.VaultEntryRepository;
import com.lifeos.vault.repository.VaultMasterPasswordRepository;
import com.lifeos.vault.store.VaultKeyStore;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Vault-side half of account deletion. Wipes every row this service owns for a user -
 * the auth-service side (the User row itself, sessions, tokens, biometric enrollments)
 * is a separate call the frontend makes to auth-service, since vault-service has no
 * access to auth-service's database.
 */
@Service
@RequiredArgsConstructor
public class VaultAccountService {

  private final VaultEntryRepository vaultEntryRepository;
  private final PaymentCardRepository paymentCardRepository;
  private final VaultCategoryRepository vaultCategoryRepository;
  private final RecoveryCodeRepository recoveryCodeRepository;
  private final VaultMasterPasswordRepository vaultMasterPasswordRepository;
  private final VaultKeyStore vaultKeyStore;

  @Transactional
  public void deleteAllData(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    vaultEntryRepository.deleteAllByUserId(userId);
    paymentCardRepository.deleteAllByUserId(userId);
    vaultCategoryRepository.deleteAllByUserId(userId);
    recoveryCodeRepository.deleteAllByUserId(userId);
    vaultMasterPasswordRepository.deleteByUserId(userId);

    vaultKeyStore.remove(userId);
  }
}
