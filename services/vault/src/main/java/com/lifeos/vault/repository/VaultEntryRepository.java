package com.lifeos.vault.repository;

import com.lifeos.vault.domains.entity.VaultEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VaultEntryRepository extends JpaRepository<VaultEntry, UUID> {
  List<VaultEntry> findAllByUserId(UUID userId);

  Optional<VaultEntry> findByIdAndUserId(UUID id, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);
}
