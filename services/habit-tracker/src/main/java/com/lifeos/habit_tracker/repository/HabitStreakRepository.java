package com.lifeos.habit_tracker.repository;

import com.lifeos.habit_tracker.domains.entity.HabitStreak;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitStreakRepository extends JpaRepository<HabitStreak, UUID> {}
