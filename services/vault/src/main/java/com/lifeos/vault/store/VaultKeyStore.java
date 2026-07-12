package com.lifeos.vault.store;

import com.lifeos.vault.domains.record.VaultKeyRecord;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class VaultKeyStore {

  private final ConcurrentHashMap<UUID, VaultKeyRecord> keys = new ConcurrentHashMap<>();

  public void save(UUID userId, VaultKeyRecord record) {
    keys.put(userId, record);
  }

  public VaultKeyRecord get(UUID userId) {
    VaultKeyRecord record = keys.get(userId);

    if (record == null || record.expiresAt().isBefore(Instant.now())) {
      keys.remove(userId);
      return null;
    }

    return record;
  }

  public void remove(UUID userId) {
    keys.remove(userId);
  }
}
