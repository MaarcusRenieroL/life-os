package com.lifeos.workouts.domains.entity;

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
@Table(name = "routines", schema = "workouts_schema")
public class Routine {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  // Null for a pre-built template - see RoutineService#copyTemplate.
  UUID userId;

  String name;

  String description;

  String templateGroup;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
