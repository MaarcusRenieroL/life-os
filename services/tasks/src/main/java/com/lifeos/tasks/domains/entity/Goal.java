package com.lifeos.tasks.domains.entity;

import com.lifeos.tasks.domains.enums.GoalReviewFrequency;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.domains.enums.LifeArea;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** Started as a minimal named lookup so "link to goal" is a real dropdown, not a pasted UUID -
 * and is now the full Goals module's root entity (milestones, metrics, reviews, links to other
 * goals). It still lives in tasks_schema so tasks' goal_id keeps a real FK; calendar and
 * habit-tracker reference it by bare UUID. Progress is derived, never stored - see
 * GoalProgressCalculator. */
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

  String description;

  @Enumerated(EnumType.STRING)
  LifeArea area;

  // 1 (most important) to 4 (least).
  @Builder.Default Integer priority = 3;

  // Stored status is the last one GoalService persisted; what the API returns is the effective
  // status derived at read time (see GoalService#effectiveStatus), since a task completing in
  // this same service changes a goal's progress without touching the goal row.
  @Enumerated(EnumType.STRING)
  @Builder.Default
  GoalStatus status = GoalStatus.ACTIVE;

  LocalDate startDate;

  LocalDate targetDate;

  @Enumerated(EnumType.STRING)
  GoalReviewFrequency reviewFrequency;

  LocalDate nextReviewDate;

  // The nextReviewDate a GOAL_REVIEW_DUE notification was already sent for, so the daily scan
  // fires once per due review rather than every day it stays overdue.
  LocalDate reviewNotifiedFor;

  Instant completedAt;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
