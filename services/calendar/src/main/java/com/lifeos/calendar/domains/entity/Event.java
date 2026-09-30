package com.lifeos.calendar.domains.entity;

import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.EventRecurrencePattern;
import com.lifeos.calendar.domains.enums.FreeBusy;
import com.lifeos.calendar.domains.enums.LifeArea;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
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
@Table(name = "events", schema = "calendar_schema")
public class Event {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String title;

  String description;

  String location;

  @Enumerated(EnumType.STRING)
  @Builder.Default
  EventCategory category = EventCategory.OTHER;

  String color;

  @Builder.Default Boolean allDay = false;

  // Populated when allDay is false; startDate/endDate are populated instead when true. Never both
  // at once - see the migration's comment for why this module keeps two column pairs rather than
  // one polymorphic pair.
  Instant startAt;

  Instant endAt;

  LocalDate startDate;

  LocalDate endDate;

  @Enumerated(EnumType.STRING)
  @Builder.Default
  FreeBusy freeBusy = FreeBusy.BUSY;

  // A closed enum (Career/Health/Finance/Learning/Relationships/Personal) - see tasks'
  // LifeArea.java, which this mirrors.
  @Enumerated(EnumType.STRING)
  LifeArea area;

  // No FK/relationship - stored references to tasks_schema.projects/goals, owned by the tasks
  // service. Unlike tasks' own projectId/goalId (real FKs now that Project/Goal live in the same
  // schema as Task), calendar has no local copy of those tables, so these stay bare UUIDs.
  UUID projectId;

  UUID goalId;

  // Set when this event was created via "convert task to event" - a stored reference into
  // tasks_schema.tasks, never joined against here.
  UUID sourceTaskId;

  // Mirrors tasks_schema.tasks' recurrence fields (see Task.java's javadoc) - a recurring
  // "definition" is an ordinary row (its own start is the first occurrence), generated
  // occurrences point back via recurringParentId with recurrencePattern null.
  @Enumerated(EnumType.STRING)
  EventRecurrencePattern recurrencePattern;

  // Shape depends on recurrencePattern, same convention as tasks' recurrenceConfig:
  //  - WEEKLY: {"daysOfWeek": [1,3,5]}
  //  - MONTHLY: {"dayOfMonth": 15}
  //  - CUSTOM: {"intervalDays": 3}
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  Map<String, Object> recurrenceConfig;

  LocalDate recurrenceEndDate;

  @Builder.Default Boolean recurrencePaused = false;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  List<LocalDate> recurrenceSkippedDates;

  UUID recurringParentId;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
