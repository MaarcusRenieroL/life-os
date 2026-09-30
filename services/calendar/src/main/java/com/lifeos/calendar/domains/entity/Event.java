package com.lifeos.calendar.domains.entity;

import com.lifeos.calendar.domains.enums.EventCategory;
import com.lifeos.calendar.domains.enums.FreeBusy;
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

  // No FK/relationship - stored references to rows owned by other
  // modules/schemas, same convention as tasks_schema.tasks' areaId/projectId/goalId.
  UUID areaId;

  UUID projectId;

  UUID goalId;

  // Set when this event was created via "convert task to event" - a stored reference into
  // tasks_schema.tasks, never joined against here.
  UUID sourceTaskId;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
