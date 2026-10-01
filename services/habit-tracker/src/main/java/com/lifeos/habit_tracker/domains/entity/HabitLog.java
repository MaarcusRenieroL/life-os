package com.lifeos.habit_tracker.domains.entity;

import com.lifeos.habit_tracker.domains.enums.HabitLogStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "habit_logs", schema = "habit_tracker_schema")
public class HabitLog {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID habitId;

  UUID userId;

  LocalDate logDate;

  @Enumerated(EnumType.STRING)
  HabitLogStatus status;

  BigDecimal value;

  String failureReason;

  String note;

  @CreationTimestamp Instant loggedAt;

  @UpdateTimestamp Instant updatedAt;
}
