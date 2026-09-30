package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.repository.GoalRepository;
import com.lifeos.tasks.service.GoalProgressAssembler.GoalProgress;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Re-derives a goal's progress and persists its in-flight status (ACTIVE / ON_TRACK / AT_RISK)
 * if it moved - called after anything that feeds progress changes, so the stored status doesn't
 * lag until the nightly GoalScheduler sweep. Split out of the services that need it so
 * GoalManagementService and GoalItemsService don't depend on each other in a cycle. */
@Component
@RequiredArgsConstructor
public class GoalStatusSyncer {

  private final GoalRepository goalRepository;
  private final GoalProgressAssembler progressAssembler;

  public GoalProgress sync(UUID userId, Goal goal) {
    GoalProgress progress = progressAssembler.assemble(userId, List.of(goal)).get(goal.getId());
    if (goal.getStatus().isInFlight() && goal.getStatus() != progress.effectiveStatus()) {
      goal.setStatus(progress.effectiveStatus());
      goalRepository.save(goal);
    }
    return progress;
  }
}
