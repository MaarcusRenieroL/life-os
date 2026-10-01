package com.lifeos.workouts.repository;

import com.lifeos.workouts.domains.entity.Exercise;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

  /** Built-ins (user_id null) plus the caller's own custom exercises. */
  List<Exercise> findAllByUserIdIsNullOrUserId(UUID userId);

  List<Exercise> findAllByIdIn(Collection<UUID> ids);

  /** One exercise the caller can see: a built-in, or one of their own. */
  @Query("select e from Exercise e where e.id = :id and (e.userId is null or e.userId = :userId)")
  Optional<Exercise> findVisible(@Param("id") UUID id, @Param("userId") UUID userId);

  Optional<Exercise> findByIdAndUserId(UUID id, UUID userId);

  boolean existsByUserIdAndNameIgnoreCase(UUID userId, String name);

  boolean existsByUserIdIsNullAndNameIgnoreCase(String name);
}
