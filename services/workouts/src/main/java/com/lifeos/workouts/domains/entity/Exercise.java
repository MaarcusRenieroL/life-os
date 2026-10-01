package com.lifeos.workouts.domains.entity;

import com.lifeos.workouts.domains.enums.Equipment;
import com.lifeos.workouts.domains.enums.ExerciseCategory;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
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
@Table(name = "exercises", schema = "workouts_schema")
public class Exercise {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  // Null for the built-in library, which every user sees.
  UUID userId;

  String name;

  @Enumerated(EnumType.STRING)
  ExerciseCategory category;

  @Enumerated(EnumType.STRING)
  Equipment equipment;

  String instructions;

  @CreationTimestamp Instant createdAt;
}
