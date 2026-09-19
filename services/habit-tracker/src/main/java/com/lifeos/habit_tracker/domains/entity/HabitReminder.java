package com.lifeos.habit_tracker.domains.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "habit_reminders", schema = "habit_tracker_schema")
public class HabitReminder {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID habitId;

  LocalTime reminderTime;

  // ISO-8601 day-of-week values (1=Monday..7=Sunday). Null means "every day
  // the habit is scheduled on", per the habit's own frequency config.
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  List<Integer> daysOfWeek;

  @Builder.Default boolean enabled = true;
}
