package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.request.CreateVaultEntryRequest;
import com.lifeos.vault.domains.dto.request.UpdateVaultEntryRequest;
import com.lifeos.vault.domains.dto.response.BulkImportResultResponse;
import com.lifeos.vault.domains.dto.response.BulkImportRowError;
import com.lifeos.vault.domains.dto.response.VaultEntryResponse;
import com.lifeos.vault.domains.dto.response.VaultEntrySummaryResponse;
import com.lifeos.vault.domains.entity.VaultEntry;
import com.lifeos.vault.domains.record.VaultKeyRecord;
import com.lifeos.vault.exception.VaultEntryNotFoundException;
import com.lifeos.vault.exception.VaultLockedException;
import com.lifeos.vault.repository.VaultEntryRepository;
import com.lifeos.vault.store.VaultKeyStore;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class VaultEntryService {

  private final VaultEntryRepository vaultEntryRepository;
  private final EncryptionService encryptionService;
  private final VaultKeyStore vaultKeyStore;

  public List<VaultEntrySummaryResponse> getEntries(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();

    return vaultEntryRepository.findAllByUserId(userId).stream().map(this::toSummary).toList();
  }

  public VaultEntryResponse getEntry(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    VaultEntry vaultEntry =
        vaultEntryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new VaultEntryNotFoundException(id));

    return toResponse(vaultEntry, key);
  }

  public void saveEntry(Authentication authentication, CreateVaultEntryRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    vaultEntryRepository.save(buildEntry(userId, request, key));
  }

  public void updateEntry(Authentication authentication, UUID id, UpdateVaultEntryRequest request) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    VaultEntry entry =
        vaultEntryRepository
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> new VaultEntryNotFoundException(id));

    entry.setType(request.getType());
    entry.setTitle(request.getTitle());
    entry.setEmail(request.getEmail());
    entry.setUsername(request.getUsername());
    entry.setUrl(request.getUrl());
    entry.setIcon(request.getIcon());
    entry.setCategoryId(request.getCategoryId());
    entry.setFavorite(request.isFavorite());
    entry.setExpiresAt(request.getExpiresAt());

    if (StringUtils.hasText(request.getPassword())) {
      var enc = encryptionService.encrypt(request.getPassword(), key);

      entry.setPasswordEncrypted(enc.ciphertext());
      entry.setPasswordIv(enc.iv());
    }

    if (StringUtils.hasText(request.getNotes())) {
      var enc = encryptionService.encrypt(request.getNotes(), key);

      entry.setNotesEncrypted(enc.ciphertext());
      entry.setNotesIv(enc.iv());
    }

    vaultEntryRepository.save(entry);
  }

  /**
   * Bulk-import entry point for CSV import - saves as many rows as it can and reports which ones
   * failed, instead of the normal single-entry saveEntry() flow where a bad request just gets
   * rejected wholesale by @Valid at the controller.
   *
   * <p>Deliberately NOT @Transactional: if it were, one bad row throwing partway through would roll
   * back every row already saved in this same call, defeating the whole point of per-row error
   * handling. Each save below commits independently.
   */
  public BulkImportResultResponse saveEntries(
      Authentication authentication, List<CreateVaultEntryRequest> requests) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);

    int imported = 0;
    List<BulkImportRowError> errors = new ArrayList<>();

    for (int i = 0; i < requests.size(); i++) {
      try {
        CreateVaultEntryRequest request = requests.get(i);

        if (!StringUtils.hasText(request.getTitle())) {
          throw new IllegalArgumentException("Title is required");
        }

        vaultEntryRepository.save(buildEntry(userId, request, key));
        imported++;
      } catch (Exception e) {
        errors.add(BulkImportRowError.builder().rowIndex(i).message(e.getMessage()).build());
      }
    }

    return BulkImportResultResponse.builder()
        .importedCount(imported)
        .failedCount(errors.size())
        .errors(errors)
        .build();
  }

  private VaultEntry buildEntry(UUID userId, CreateVaultEntryRequest request, SecretKey key) {
    VaultEntry.VaultEntryBuilder builder =
        VaultEntry.builder()
            .userId(userId)
            .type(request.getType())
            .email(request.getEmail())
            .title(request.getTitle())
            .username(request.getUsername())
            .url(request.getUrl())
            .icon(request.getIcon())
            .categoryId(request.getCategoryId())
            .favorite(request.isFavorite())
            .expiresAt(request.getExpiresAt());

    if (StringUtils.hasText(request.getPassword())) {
      var enc = encryptionService.encrypt(request.getPassword(), key);

      builder.passwordEncrypted(enc.ciphertext()).passwordIv(enc.iv());
    }

    if (StringUtils.hasText(request.getNotes())) {
      var enc = encryptionService.encrypt(request.getNotes(), key);

      builder.notesEncrypted(enc.ciphertext()).notesIv(enc.iv());
    }

    return builder.build();
  }

  @Transactional
  public void deleteEntry(Authentication authentication, UUID id) {
    UUID userId = (UUID) authentication.getPrincipal();
    vaultEntryRepository.deleteByIdAndUserId(id, userId);
  }

  private VaultEntrySummaryResponse toSummary(VaultEntry e) {
    return VaultEntrySummaryResponse.builder()
        .id(e.getId())
        .type(e.getType())
        .title(e.getTitle())
        .email(e.getEmail())
        .username(e.getUsername())
        .url(e.getUrl())
        .icon(e.getIcon())
        .categoryId(e.getCategoryId())
        .favorite(e.isFavorite())
        .expiresAt(e.getExpiresAt())
        .createdAt(e.getCreatedAt())
        .updatedAt(e.getUpdatedAt())
        .build();
  }

  private VaultEntryResponse toResponse(VaultEntry e, SecretKey key) {
    String password =
        e.getPasswordEncrypted() != null
            ? encryptionService.decrypt(e.getPasswordEncrypted(), e.getPasswordIv(), key)
            : null;
    String notes =
        e.getNotesEncrypted() != null
            ? encryptionService.decrypt(e.getNotesEncrypted(), e.getNotesIv(), key)
            : null;

    return VaultEntryResponse.builder()
        .id(e.getId())
        .type(e.getType())
        .title(e.getTitle())
        .email(e.getEmail())
        .username(e.getUsername())
        .url(e.getUrl())
        .icon(e.getIcon())
        .password(password)
        .notes(notes)
        .categoryId(e.getCategoryId())
        .favorite(e.isFavorite())
        .expiresAt(e.getExpiresAt())
        .createdAt(e.getCreatedAt())
        .updatedAt(e.getUpdatedAt())
        .build();
  }

  private SecretKey requireUnlockedKey(UUID userId) {
    VaultKeyRecord record = vaultKeyStore.get(userId);

    if (record == null) {
      throw new VaultLockedException();
    }

    return record.key();
  }
}
