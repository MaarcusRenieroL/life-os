package com.lifeos.tasks.domains.entity;

import java.time.LocalDate;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "goal_milestones", schema = "tasks_schema")
public class GoalMilestone {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID goalId;

  UUID userId;

  String title;

  LocalDate targetDate;

  // Null until the user ticks it off.
  Instant completedAt;

  @CreationTimestamp Instant createdAt;
}
