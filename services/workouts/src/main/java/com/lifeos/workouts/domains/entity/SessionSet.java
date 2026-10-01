package com.lifeos.workouts.domains.entity;

import java.math.BigDecimal;
import java.time.Instant;
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
@Table(name = "session_sets", schema = "workouts_schema")
public class SessionSet {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID sessionId;

  UUID exerciseId;

  // Order of the exercise within the session, then the set within the exercise.
  Integer exercisePosition;

  Integer setNumber;

  Integer targetReps;

  BigDecimal targetWeight;

  Integer actualReps;

  BigDecimal actualWeight;

  Integer restSeconds;

  @Builder.Default Boolean completed = false;

  Instant completedAt;

  @Builder.Default Boolean isPr = false;
}
