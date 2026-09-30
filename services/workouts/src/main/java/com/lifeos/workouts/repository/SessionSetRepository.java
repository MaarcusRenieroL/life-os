package com.lifeos.workouts.repository;

import com.lifeos.workouts.domains.entity.SessionSet;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionSetRepository extends JpaRepository<SessionSet, UUID> {

  List<SessionSet> findAllBySessionIdOrderByExercisePositionAscSetNumberAsc(UUID sessionId);

  List<SessionSet> findAllBySessionIdIn(Collection<UUID> sessionIds);

  Optional<SessionSet> findByIdAndSessionId(UUID id, UUID sessionId);

  boolean existsByExerciseId(UUID exerciseId);
}
