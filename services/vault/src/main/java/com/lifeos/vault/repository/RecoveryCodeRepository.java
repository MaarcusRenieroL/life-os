package com.lifeos.vault.repository;

import com.lifeos.vault.domains.entity.RecoveryCode;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecoveryCodeRepository extends JpaRepository<RecoveryCode, UUID> {

  List<RecoveryCode> findAllByUserIdOrderByCreatedAtAsc(UUID userId);

  List<RecoveryCode> findAllByUserIdAndUsedFalse(UUID userId);

  void deleteAllByUserId(UUID userId);
}
