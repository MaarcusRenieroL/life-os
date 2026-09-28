package com.lifeos.tasks.domains.entity;

import com.lifeos.tasks.domains.enums.TimeEntryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/** One work or break session, Pomodoro-timer style - a running entry has endedAt/durationMinutes
 * both null; TimeEntryService.stop() fills them in. taskId is optional (a bare UUID, no FK, same
 * convention as Task's own projectId/goalId) - a session doesn't have to be tied to a specific
 * task to be worth recording. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "time_entries", schema = "tasks_schema")
public class TimeEntry {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  UUID taskId;

  @Enumerated(EnumType.STRING)
  TimeEntryType type;

  Instant startedAt;

  Instant endedAt;

  Integer durationMinutes;

  String notes;

  @CreationTimestamp Instant createdAt;
}
