package com.lifeos.workouts.domains.entity;


import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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
@Table(name = "routine_exercises", schema = "workouts_schema")
public class RoutineExercise {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID routineId;

  UUID exerciseId;

  Integer position;

  Integer targetSets;

  Integer targetReps;

  BigDecimal targetWeight;

  Integer restSeconds;
}
