package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.EmailCategory;
import com.lifeos.job_tracker.domains.enums.EmailDirection;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "email_messages", schema = "job_tracker_schema")
public class EmailMessage {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "application_id")
  UUID applicationId;

  @Enumerated(EnumType.STRING)
  EmailDirection direction;

  @Column(name = "external_message_id")
  String externalMessageId;

  @Column(name = "thread_id")
  String threadId;

  @Column(name = "from_address")
  String fromAddress;

  @Column(name = "to_address")
  String toAddress;

  String subject;

  String body;

  @Enumerated(EnumType.STRING)
  EmailCategory category;

  @Column(name = "received_at")
  Instant receivedAt;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "parsed_json")
  Map<String, Object> parsedJson;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
