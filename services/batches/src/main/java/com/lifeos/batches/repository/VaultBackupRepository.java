package com.lifeos.batches.repository;

import com.lifeos.batches.domains.entity.VaultBackup;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VaultBackupRepository extends JpaRepository<VaultBackup, UUID> {

  List<VaultBackup> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

  Optional<VaultBackup> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);
}
