package com.lifeos.finance_tracker.domains.entity;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A bank alert or statement row that could not be booked, kept so nothing silently goes missing. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "import_failures", schema = "finance_schema")
public class ImportFailure {

  public static final String OPEN = "OPEN";
  public static final String RESOLVED = "RESOLVED";
  public static final String DISMISSED = "DISMISSED";

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String source;

  String reason;

  String reference;

  String sender;

  String subject;

  String snippet;

  @JdbcTypeCode(SqlTypes.JSON)
  String payload;

  String detail;

  @Builder.Default String status = OPEN;

  @CreationTimestamp Instant createdAt;

  Instant resolvedAt;
}
