package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.request.CreateVaultEntryRequest;
import com.lifeos.vault.domains.dto.request.UpdateVaultEntryRequest;
import com.lifeos.vault.domains.entity.VaultEntry;
import com.lifeos.vault.domains.record.VaultKeyRecord;
import com.lifeos.vault.exception.VaultEntryNotFoundException;
import com.lifeos.vault.exception.VaultLockedException;
import com.lifeos.vault.repository.VaultEntryRepository;
import com.lifeos.vault.store.VaultKeyStore;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VaultEntryService {

  private final VaultEntryRepository vaultEntryRepository;
  private final EncryptionService encryptionService;
  private final VaultKeyStore vaultKeyStore;

  public List<VaultEntry> getEntries(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    List<VaultEntry> vaultEntries = vaultEntryRepository.findAllByUserId(userId);

    for (VaultEntry vaultEntry : vaultEntries) {
      vaultEntry.setContentEncrypted(
          encryptionService.decrypt(vaultEntry.getContentEncrypted(), vaultEntry.getIv(), key));
    }

    return vaultEntries;
  }

  public void saveEntry(
      Authentication authentication, CreateVaultEntryRequest createVaultEntryRequest) {

    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    EncryptionService.EncryptedData encrypted =
        encryptionService.encrypt(createVaultEntryRequest.getContent(), key);

    vaultEntryRepository.save(
        VaultEntry.builder()
            .title(createVaultEntryRequest.getTitle())
            .contentEncrypted(encrypted.ciphertext())
            .iv(encrypted.iv())
            .userId(userId)
            .build());
  }

  public VaultEntry getEntry(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    VaultEntry vaultEntry =
        vaultEntryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new VaultEntryNotFoundException(id));

    vaultEntry.setContentEncrypted(
        encryptionService.decrypt(vaultEntry.getContentEncrypted(), vaultEntry.getIv(), key));

    return vaultEntry;
  }

  public void updateEntry(
      Authentication authentication, UUID id, UpdateVaultEntryRequest updateVaultEntryRequest) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    VaultEntry existingVaultEntry =
        vaultEntryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new VaultEntryNotFoundException(id));

    EncryptionService.EncryptedData encrypted =
        encryptionService.encrypt(updateVaultEntryRequest.getContent(), key);

    existingVaultEntry.setTitle(updateVaultEntryRequest.getTitle());
    existingVaultEntry.setContentEncrypted(encrypted.ciphertext());
    existingVaultEntry.setIv(encrypted.iv());

    vaultEntryRepository.save(existingVaultEntry);
  }

  public void deleteEntry(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();
    vaultEntryRepository.deleteByIdAndUserId(id, userId);
  }

  private SecretKey requireUnlockedKey(UUID userId) {
    VaultKeyRecord record = vaultKeyStore.get(userId);

    if (record == null) {
      throw new VaultLockedException();
    }

    return record.key();
  }
}
