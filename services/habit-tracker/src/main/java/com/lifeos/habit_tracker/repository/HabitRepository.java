package com.lifeos.habit_tracker.repository;

import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface HabitRepository
    extends JpaRepository<Habit, UUID>, JpaSpecificationExecutor<Habit> {

  List<Habit> findAllByUserId(UUID userId);

  Optional<Habit> findByIdAndUserId(UUID id, UUID userId);

  List<Habit> findAllByUserIdAndStatus(UUID userId, HabitStatus status);

  List<Habit> findAllByStatus(HabitStatus status);
}
