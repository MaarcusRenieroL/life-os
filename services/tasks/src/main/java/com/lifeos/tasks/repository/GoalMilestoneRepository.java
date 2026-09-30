package com.lifeos.tasks.repository;

import com.lifeos.tasks.domains.entity.GoalMilestone;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalMilestoneRepository extends JpaRepository<GoalMilestone, UUID> {

  List<GoalMilestone> findAllByUserId(UUID userId);

  List<GoalMilestone> findAllByGoalIdOrderByTargetDateAscCreatedAtAsc(UUID goalId);

  Optional<GoalMilestone> findByIdAndGoalIdAndUserId(UUID id, UUID goalId, UUID userId);
}
