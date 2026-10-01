package com.lifeos.tasks.repository;

import com.lifeos.tasks.domains.entity.GoalLink;
import com.lifeos.tasks.domains.enums.GoalLinkType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalLinkRepository extends JpaRepository<GoalLink, UUID> {

  List<GoalLink> findAllByUserId(UUID userId);

  Optional<GoalLink> findByIdAndUserId(UUID id, UUID userId);

  boolean existsBySourceGoalIdAndTargetGoalIdAndLinkType(
      UUID sourceGoalId, UUID targetGoalId, GoalLinkType linkType);
}
