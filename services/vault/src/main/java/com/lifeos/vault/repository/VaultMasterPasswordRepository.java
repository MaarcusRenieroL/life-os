package com.lifeos.vault.repository;

import com.lifeos.vault.domains.entity.VaultMasterPassword;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VaultMasterPasswordRepository extends JpaRepository<VaultMasterPassword, UUID> {

  Optional<VaultMasterPassword> findByUserId(UUID userId);

  boolean existsByUserId(UUID userId);
}
