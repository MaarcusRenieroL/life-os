package com.lifeos.tasks.scheduler;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.repository.GoalRepository;
import com.lifeos.tasks.service.GoalProgressAssembler;
import com.lifeos.tasks.service.GoalProgressAssembler.GoalProgress;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Daily sweep over every user's in-flight goals: persists status drift (a task finishing or time
 * passing moves a goal between ON_TRACK and AT_RISK without anyone touching the goal), notifies
 * once when a goal newly slips to AT_RISK, and notifies once per due scheduled review.
 * reviewNotifiedFor stops the review nudge repeating every day a review stays overdue. */
@Component
@RequiredArgsConstructor
public class GoalScheduler {

  private static final Logger log = LoggerFactory.getLogger(GoalScheduler.class);

  private final GoalRepository goalRepository;
  private final GoalProgressAssembler progressAssembler;
  private final NotificationEventPublisher notificationEventPublisher;

  @Scheduled(cron = "${goals.sweep.cron:0 30 8 * * *}")
  @Transactional
  public void sweep() {
    Map<UUID, List<Goal>> byUser =
        goalRepository
            .findAllByStatusIn(List.of(GoalStatus.ACTIVE, GoalStatus.ON_TRACK, GoalStatus.AT_RISK))
            .stream()
            .collect(Collectors.groupingBy(Goal::getUserId));

    byUser.forEach(
        (userId, goals) -> {
          try {
            sweepUser(userId, goals);
          } catch (Exception exception) {
            // One user's bad data must not stop everyone else's sweep.
            log.warn("Goal sweep failed for user {} ({})", userId, exception.getMessage());
          }
        });
  }

  void sweepUser(UUID userId, List<Goal> goals) {
    LocalDate today = LocalDate.now();
    Map<UUID, GoalProgress> progress = progressAssembler.assemble(userId, goals);

    for (Goal goal : goals) {
      GoalStatus effective = progress.get(goal.getId()).effectiveStatus();
      boolean changed = false;

      if (effective != goal.getStatus()) {
        if (effective == GoalStatus.AT_RISK) {
          notificationEventPublisher.publish(
              userId,
              NotificationEventType.GOAL_AT_RISK,
              goal.getName(),
              "This goal has fallen behind schedule (" + progress.get(goal.getId()).result().overallPct() + "% done).",
              Map.of("goalId", goal.getId().toString()));
        }
        goal.setStatus(effective);
        changed = true;
      }

      LocalDate nextReview = goal.getNextReviewDate();
      if (nextReview != null && !nextReview.isAfter(today) && !nextReview.equals(goal.getReviewNotifiedFor())) {
        notificationEventPublisher.publish(
            userId,
            NotificationEventType.GOAL_REVIEW_DUE,
            goal.getName(),
            "Time for a goal review.",
            Map.of("goalId", goal.getId().toString()));
        goal.setReviewNotifiedFor(nextReview);
        changed = true;
      }

      if (changed) goalRepository.save(goal);
    }
  }
}
