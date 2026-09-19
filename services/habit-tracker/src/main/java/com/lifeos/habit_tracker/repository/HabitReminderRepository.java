package com.lifeos.habit_tracker.repository;

import com.lifeos.habit_tracker.domains.entity.HabitReminder;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitReminderRepository extends JpaRepository<HabitReminder, UUID> {

  List<HabitReminder> findAllByHabitId(UUID habitId);

  /** Bulk variant, so callers checking many habits at once don't issue one query per habit. */
  List<HabitReminder> findAllByHabitIdIn(List<UUID> habitIds);

  Optional<HabitReminder> findByIdAndHabitId(UUID id, UUID habitId);

  List<HabitReminder> findAllByEnabledTrue();
}
