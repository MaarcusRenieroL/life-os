package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.ImportFailure;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportFailureRepository extends JpaRepository<ImportFailure, UUID> {

  List<ImportFailure> findAllByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, String status);

  Optional<ImportFailure> findByIdAndUserId(UUID id, UUID userId);

  Optional<ImportFailure> findByUserIdAndReference(UUID userId, String reference);

  long countByUserIdAndStatus(UUID userId, String status);
}
