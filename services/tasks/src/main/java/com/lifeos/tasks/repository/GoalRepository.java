package com.lifeos.tasks.repository;

import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.domains.enums.GoalStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalRepository extends JpaRepository<Goal, UUID> {

  List<Goal> findAllByUserIdOrderByNameAsc(UUID userId);

  Optional<Goal> findByIdAndUserId(UUID id, UUID userId);

  // Feeds the daily GoalScheduler, which sweeps every user's in-flight goals rather than one
  // user's.
  List<Goal> findAllByStatusIn(Collection<GoalStatus> statuses);
}
