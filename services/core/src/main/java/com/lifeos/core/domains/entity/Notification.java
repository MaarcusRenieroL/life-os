package com.lifeos.core.domains.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** A materialized notification, consumed from the {@code notification-events} Kafka topic (see
 * NotificationEventConsumer). {@code id} is the publisher-assigned eventId, not
 * @GeneratedValue - same dedup pattern as batches' AuditEvent, so a redelivered Kafka message is
 * a safe no-op on save (existsById check in the consumer, not a DB constraint, mirroring
 * AuditEventConsumer). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "notifications", schema = "core_schema")
public class Notification {

  @Id
  @Column(name = "id")
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "module")
  String module;

  @Column(name = "type")
  String type;

  @Column(name = "title")
  String title;

  @Column(name = "body")
  String body;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "metadata")
  Map<String, String> metadata;

  @Column(name = "read")
  boolean read;

  @Column(name = "requires_ai_fallback_approval")
  boolean requiresAiFallbackApproval;

  @Column(name = "ai_fallback_approved")
  Boolean aiFallbackApproved;

  @Column(name = "occurred_at")
  Instant occurredAt;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
