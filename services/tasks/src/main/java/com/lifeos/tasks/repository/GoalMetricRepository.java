package com.lifeos.tasks.repository;

import com.lifeos.tasks.domains.entity.GoalMetric;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalMetricRepository extends JpaRepository<GoalMetric, UUID> {

  List<GoalMetric> findAllByUserId(UUID userId);

  List<GoalMetric> findAllByGoalIdOrderByCreatedAtAsc(UUID goalId);

  Optional<GoalMetric> findByIdAndGoalIdAndUserId(UUID id, UUID goalId, UUID userId);
}
