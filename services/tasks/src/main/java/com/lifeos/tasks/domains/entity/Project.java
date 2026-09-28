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

/** A minimal, user-managed lookup so "link to project" can be a real dropdown of named things
 * rather than a raw UUID field - deliberately just a name, no status/dates/description, since
 * nothing in this codebase's spec asked for a full Projects module yet (that's the still-reserved,
 * still-disabled "PJ" module code in app-modules.ts). Lives in tasks_schema rather than its own
 * service because tasks is the only current consumer; calendar reads this same list by ID. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "projects", schema = "tasks_schema")
public class Project {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String name;

  @CreationTimestamp Instant createdAt;
}
