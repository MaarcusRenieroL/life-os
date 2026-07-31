package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.CategorizationRule;
import com.lifeos.finance_tracker.domains.enums.MatchField;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategorizationRuleRepository extends JpaRepository<CategorizationRule, UUID> {

  List<CategorizationRule> findAllByUserId(UUID userId);

  Optional<CategorizationRule> findByIdAndUserId(UUID id, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);

  List<CategorizationRule> findAllByUserIdAndIsActiveTrueOrderByPriorityDesc(UUID userId);

  Optional<CategorizationRule> findByUserIdAndMatchFieldAndMatchValueIgnoreCase(
      UUID userId, MatchField matchField, String matchValue);

  @Query("SELECT COALESCE(MAX(r.priority), 0) FROM CategorizationRule r WHERE r.userId = :userId")
  int findMaxPriorityByUserId(@Param("userId") UUID userId);
}
