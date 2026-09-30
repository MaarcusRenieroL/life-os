package com.lifeos.workouts.repository;

import com.lifeos.workouts.domains.entity.Routine;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoutineRepository extends JpaRepository<Routine, UUID> {

  List<Routine> findAllByUserIdOrderByNameAsc(UUID userId);

  List<Routine> findAllByUserIdIsNullOrderByTemplateGroupAscIdAsc();

  Optional<Routine> findByIdAndUserId(UUID id, UUID userId);

  Optional<Routine> findByIdAndUserIdIsNull(UUID id);
}
