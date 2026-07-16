package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.response.VaultStatusResponse;
import com.lifeos.vault.domains.entity.VaultMasterPassword;
import com.lifeos.vault.domains.record.VaultKeyRecord;
import com.lifeos.vault.exception.InvalidMasterPasswordException;
import com.lifeos.vault.exception.MasterPasswordAlreadySetException;
import com.lifeos.vault.repository.VaultMasterPasswordRepository;
import com.lifeos.vault.store.VaultKeyStore;
import java.time.Instant;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VaultMasterPasswordService {

  private static final long VAULT_UNLOCK_DURATION_SECONDS = 900; // 15 minutes

  private final VaultMasterPasswordRepository vaultMasterPasswordRepository;
  private final EncryptionService encryptionService;
  private final PasswordEncoder passwordEncoder;
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
    return VaultStatusResponse.builder()
        .hasMasterPassword(vaultMasterPasswordRepository.existsByUserId(userId))
        .unlocked(vaultKeyStore.get(userId) != null)
        .build();
  }
}
