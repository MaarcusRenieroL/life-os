package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.response.ActionRequiredEntryResponse;
import com.lifeos.vault.domains.dto.response.HealthSummaryResponse;
import com.lifeos.vault.domains.dto.response.PasswordAgeBucketResponse;
import com.lifeos.vault.domains.entity.VaultEntry;
import com.lifeos.vault.domains.record.VaultKeyRecord;
import com.lifeos.vault.exception.VaultLockedException;
import com.lifeos.vault.repository.VaultEntryRepository;
import com.lifeos.vault.store.VaultKeyStore;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HealthService {

  private final VaultEntryRepository vaultEntryRepository;
  private final VaultKeyStore vaultKeyStore;
  private final EncryptionService encryptionService;
  private final PasswordStrengthService passwordStrengthService;

  public HealthSummaryResponse getSummary(Authentication authentication) {
    UUID userId = (UUID) authentication.getPrincipal();
    SecretKey key = requireUnlockedKey(userId);
    List<VaultEntry> entries = vaultEntryRepository.findAllByUserId(userId);

    HashMap<VaultEntry, String> plainPasswordMap = new HashMap<>();

    for (VaultEntry entry : entries) {
      if (entry.getPasswordEncrypted() == null) {
        continue;
      }

      plainPasswordMap.put(
          entry,
          encryptionService.decrypt(entry.getPasswordEncrypted(), entry.getPasswordIv(), key));
    }

    HashMap<VaultEntry, PasswordStrengthService.Strength> strengthByEntry = new HashMap<>();

    for (var e : plainPasswordMap.entrySet()) {
      strengthByEntry.put(e.getKey(), passwordStrengthService.score(e.getValue()));
    }

    int weakCount = 0;
    Set<VaultEntry> weakEntries = new HashSet<>();

    for (var e : strengthByEntry.entrySet()) {
      if (e.getValue() == PasswordStrengthService.Strength.VERY_WEAK
          || e.getValue() == PasswordStrengthService.Strength.WEAK) {
        weakCount++;
        weakEntries.add(e.getKey());
      }
    }

    HashMap<String, List<VaultEntry>> byPasswordHash = new HashMap<>();

    for (var e : plainPasswordMap.entrySet()) {
      String hash = sha256(e.getValue());
      byPasswordHash.computeIfAbsent(hash, k -> new ArrayList<>()).add(e.getKey());
    }

    List<List<VaultEntry>> duplicateGroups =
        byPasswordHash.values().stream().filter(group -> group.size() > 1).toList();

    int duplicateCount = duplicateGroups.stream().mapToInt(List::size).sum();

    Set<VaultEntry> duplicateEntries = new HashSet<>();
    duplicateGroups.forEach(duplicateEntries::addAll);

    int under3Months = 0;
    int between3And6Months = 0;
    int between6And12Months = 0;
    int over1Year = 0;
    Instant now = Instant.now();

    // Iterate plainPasswordMap's keys, not entries - that set is already exactly
    // "entries with a password" (NOTE-type entries never made it into that map,
    // see the loop above), so age distribution only reflects password age, not
    // "how long since this note was last touched".
    for (VaultEntry entry : plainPasswordMap.keySet()) {
      long ageDays = Duration.between(entry.getUpdatedAt(), now).toDays();

      if (ageDays < 90) {
        under3Months++;
      } else if (ageDays < 180) {
        between3And6Months++;
      } else if (ageDays < 365) {
        between6And12Months++;
      } else {
        over1Year++;
      }
    }

    List<PasswordAgeBucketResponse> ageBuckets =
        List.of(
            PasswordAgeBucketResponse.builder().label("<3mo").count(under3Months).build(),
            PasswordAgeBucketResponse.builder().label("3-6mo").count(between3And6Months).build(),
            PasswordAgeBucketResponse.builder().label("6-12mo").count(between6And12Months).build(),
            PasswordAgeBucketResponse.builder().label("1y+").count(over1Year).build());

    List<ActionRequiredEntryResponse> actionRequired = new ArrayList<>();

    for (VaultEntry entry : entries) {
      String issue;

      if (weakEntries.contains(entry)) {
        issue = "Weak password";
      } else if (duplicateEntries.contains(entry)) {
        issue = "Reused password";
      } else {
        continue;
      }

      actionRequired.add(
          ActionRequiredEntryResponse.builder()
              .id(entry.getId())
              .title(entry.getTitle())
              .issue(issue)
              .build());
    }

    int score = 100 - (weakCount * 5) - (duplicateCount * 8);
    score = Math.max(0, Math.min(100, score));

    return HealthSummaryResponse.builder()
        .score(score)
        .totalCount(entries.size())
        .weakCount(weakCount)
        .duplicateCount(duplicateCount)
        .compromisedCount(0)
        .ageBuckets(ageBuckets)
        .actionRequired(actionRequired)
        .build();
  }

  private SecretKey requireUnlockedKey(UUID userId) {
    VaultKeyRecord record = vaultKeyStore.get(userId);
    if (record == null) {
      throw new VaultLockedException();
    }
    return record.key();
  }

  private String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashBytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
      return Base64.getEncoder().encodeToString(hashBytes);
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException(e);
    }
  }
}
