package com.lifeos.habit_tracker.repository;

import com.lifeos.habit_tracker.domains.entity.HabitReminder;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitReminderRepository extends JpaRepository<HabitReminder, UUID> {

  List<HabitReminder> findAllByHabitId(UUID habitId);

  Optional<HabitReminder> findByIdAndHabitId(UUID id, UUID habitId);

  List<HabitReminder> findAllByEnabledTrue();
}
