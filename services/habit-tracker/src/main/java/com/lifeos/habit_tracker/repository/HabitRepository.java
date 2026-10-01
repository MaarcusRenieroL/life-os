package com.lifeos.habit_tracker.repository;

import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HabitRepository
    extends JpaRepository<Habit, UUID>, JpaSpecificationExecutor<Habit> {

  List<Habit> findAllByUserId(UUID userId);

  /** Unlinks every habit of this user from a goal that was deleted in the goals module. */
  @Modifying
  @Query("update Habit h set h.goalId = null where h.userId = :userId and h.goalId = :goalId")
  int clearGoal(@Param("userId") UUID userId, @Param("goalId") UUID goalId);

  Optional<Habit> findByIdAndUserId(UUID id, UUID userId);

  List<Habit> findAllByUserIdAndStatus(UUID userId, HabitStatus status);

  List<Habit> findAllByStatus(HabitStatus status);
}
