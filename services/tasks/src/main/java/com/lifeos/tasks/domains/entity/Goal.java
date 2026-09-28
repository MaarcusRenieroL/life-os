package com.lifeos.tasks.domains.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

/** Same rationale as Project - a minimal named lookup so "link to goal" is a real dropdown, not a
 * pasted UUID. Lives in tasks_schema; calendar reads this same list by ID. The still-disabled "GL"
 * module code in app-modules.ts is reserved for a fuller Goals module later. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "goals", schema = "tasks_schema")
public class Goal {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String name;

  @CreationTimestamp Instant createdAt;
}
