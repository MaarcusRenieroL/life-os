package com.lifeos.tasks.domains.entity;

import com.lifeos.tasks.domains.enums.GoalLinkType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "goal_links", schema = "tasks_schema")
public class GoalLink {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  UUID sourceGoalId;

  UUID targetGoalId;

  @Enumerated(EnumType.STRING)
  GoalLinkType linkType;

  @CreationTimestamp Instant createdAt;
}
