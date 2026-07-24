package com.lifeos.batches.domains.entity;

import com.lifeos.common.events.AuditEventType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "audit_events", schema = "batches_schema")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuditEvent {

  @Id UUID eventId;

  String service;

  UUID userId;

  @Enumerated(EnumType.STRING)
  AuditEventType eventType;

  String description;

  @JdbcTypeCode(SqlTypes.JSON)
  Map<String, String> metadata;

  Instant occurredAt;

  @CreationTimestamp Instant createdAt;
}
