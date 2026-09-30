package com.lifeos.workouts.domains.entity;

import com.lifeos.workouts.domains.enums.SessionStatus;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
@Table(name = "workout_sessions", schema = "workouts_schema")
public class WorkoutSession {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  UUID routineId;

  String name;

  @Enumerated(EnumType.STRING)
  SessionStatus status;

  Instant scheduledFor;

  Instant startedAt;

  Instant completedAt;

  Integer durationSeconds;

  String notes;

  // Bare uuids into tasks_schema.goals / calendar_schema.events - see the V1 migration.
  UUID goalId;

  UUID calendarEventId;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
