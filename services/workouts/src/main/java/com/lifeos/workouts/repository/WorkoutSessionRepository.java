package com.lifeos.workouts.repository;

import com.lifeos.workouts.domains.entity.WorkoutSession;
import com.lifeos.workouts.domains.enums.SessionStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {

  List<WorkoutSession> findAllByUserId(UUID userId);

  List<WorkoutSession> findAllByUserIdAndStatus(UUID userId, SessionStatus status);

  List<WorkoutSession> findAllByUserIdAndStatusAndCompletedAtGreaterThanEqual(
      UUID userId, SessionStatus status, Instant completedAt);

  Optional<WorkoutSession> findByIdAndUserId(UUID id, UUID userId);

  Optional<WorkoutSession> findFirstByUserIdAndStatus(UUID userId, SessionStatus status);
}
