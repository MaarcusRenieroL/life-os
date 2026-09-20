package com.lifeos.habit_tracker.repository;

import com.lifeos.habit_tracker.domains.entity.HabitLog;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitLogRepository extends JpaRepository<HabitLog, UUID> {

  Optional<HabitLog> findByHabitIdAndLogDate(UUID habitId, LocalDate logDate);

  Optional<HabitLog> findByIdAndHabitId(UUID id, UUID habitId);

  List<HabitLog> findAllByHabitIdAndLogDateBetweenOrderByLogDateAsc(
      UUID habitId, LocalDate from, LocalDate to);

  List<HabitLog> findAllByHabitIdOrderByLogDateAsc(UUID habitId);

  /**
   * Descending page of a habit's logs, newest first. Used by {@link
   * com.lifeos.habit_tracker.service.StreakService#recompute} to walk backward from today and
   * stop as soon as the current streak breaks, instead of reading the habit's entire log history
   * on every write.
   */
  List<HabitLog> findAllByHabitIdOrderByLogDateDesc(UUID habitId, Pageable pageable);

  List<HabitLog> findAllByUserIdAndLogDateBetween(UUID userId, LocalDate from, LocalDate to);

  List<HabitLog> findAllByHabitIdInAndLogDate(List<UUID> habitIds, LocalDate logDate);
}
