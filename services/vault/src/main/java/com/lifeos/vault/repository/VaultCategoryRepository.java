package com.lifeos.vault.repository;

import com.lifeos.vault.domains.entity.VaultCategory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VaultCategoryRepository extends JpaRepository<VaultCategory, UUID> {

  List<VaultCategory> findAllByUserId(UUID userId);

  Optional<VaultCategory> findByIdAndUserId(UUID categoryId, UUID userId);

  void deleteByIdAndUserId(UUID categoryId, UUID userId);

  boolean existsByUserIdAndName(UUID userId, String name);
}
