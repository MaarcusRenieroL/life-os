package com.lifeos.core.automation;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AutomationExecutionRepository extends JpaRepository<AutomationExecution, UUID> {

  List<AutomationExecution> findAllByUserIdOrderByExecutedAtDesc(UUID userId, Pageable pageable);

  List<AutomationExecution> findAllByRuleIdAndUserIdOrderByExecutedAtDesc(UUID ruleId, UUID userId, Pageable pageable);

  boolean existsByRuleIdAndEventId(UUID ruleId, UUID eventId);
}
