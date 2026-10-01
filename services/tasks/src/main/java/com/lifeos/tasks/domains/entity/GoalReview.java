package com.lifeos.tasks.domains.entity;

import com.lifeos.tasks.domains.enums.GoalStatus;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "goal_reviews", schema = "tasks_schema")
public class GoalReview {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID goalId;

  UUID userId;

  LocalDate reviewDate;

  String progressSummary;

  String blockers;

  String nextSteps;

  String notes;

  // What the goal looked like when this review was written, so the history reads as a trend even
  // though progress itself is never stored.
  Integer progressSnapshot;

  @Enumerated(EnumType.STRING)
  GoalStatus statusSnapshot;

  @CreationTimestamp Instant createdAt;
}
