package com.lifeos.workouts.repository;

import com.lifeos.workouts.domains.entity.RoutineExercise;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoutineExerciseRepository extends JpaRepository<RoutineExercise, UUID> {

  List<RoutineExercise> findAllByRoutineIdOrderByPositionAsc(UUID routineId);

  List<RoutineExercise> findAllByRoutineIdIn(Collection<UUID> routineIds);

  void deleteAllByRoutineId(UUID routineId);

  boolean existsByExerciseId(UUID exerciseId);
}
