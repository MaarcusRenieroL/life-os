package com.lifeos.workouts.repository;

import com.lifeos.workouts.domains.entity.WorkoutSession;
import com.lifeos.workouts.domains.enums.SessionStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {

  List<WorkoutSession> findAllByUserId(UUID userId);

  @Modifying
  @Query("update WorkoutSession s set s.goalId = null where s.userId = :userId and s.goalId = :goalId")
  int clearGoal(@Param("userId") UUID userId, @Param("goalId") UUID goalId);

  List<WorkoutSession> findAllByUserIdAndStatus(UUID userId, SessionStatus status);

  List<WorkoutSession> findAllByUserIdAndStatusAndCompletedAtGreaterThanEqual(
      UUID userId, SessionStatus status, Instant completedAt);

  Optional<WorkoutSession> findByIdAndUserId(UUID id, UUID userId);

  Optional<WorkoutSession> findFirstByUserIdAndStatus(UUID userId, SessionStatus status);
}
