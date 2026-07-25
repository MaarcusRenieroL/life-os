package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.CategorizationRule;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategorizationRuleRepository extends JpaRepository<CategorizationRule, UUID> {

  List<CategorizationRule> findAllByUserId(UUID userId);

  Optional<CategorizationRule> findByIdAndUserId(UUID id, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);
}
