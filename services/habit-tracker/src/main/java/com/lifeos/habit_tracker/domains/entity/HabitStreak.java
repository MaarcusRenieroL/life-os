package com.lifeos.habit_tracker.domains.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "habit_streaks", schema = "habit_tracker_schema")
public class HabitStreak {

  // PK = habit_id: one derived/cached row per habit, upserted by
  // StreakService whenever a log for that habit is written.
  @Id UUID habitId;

  @Builder.Default int currentStreak = 0;

  @Builder.Default int longestStreak = 0;

  LocalDate lastComputedDate;
}
