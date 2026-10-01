package com.lifeos.core.automation;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AutomationRuleRepository extends JpaRepository<AutomationRule, UUID> {

  List<AutomationRule> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

  Optional<AutomationRule> findByIdAndUserId(UUID id, UUID userId);

  List<AutomationRule> findAllByUserIdAndEnabledTrueAndTriggerTypeIn(UUID userId, Collection<TriggerType> types);

  // The scheduled/threshold sweeps look across every user's rules.
  List<AutomationRule> findAllByEnabledTrueAndTriggerType(TriggerType type);
}
