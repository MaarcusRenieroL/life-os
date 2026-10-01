package com.lifeos.core.domains.entity;

import com.lifeos.core.domains.enums.EmailCategory;
import com.lifeos.core.domains.enums.EmailHubStatus;
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
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "email_hub_items", schema = "core_schema")
public class EmailHubItem {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "gmail_message_id")
  String gmailMessageId;

  @Column(name = "from_address")
  String fromAddress;

  String subject;

  String snippet;

  @Column(name = "received_at")
  Instant receivedAt;

  @Enumerated(EnumType.STRING)
  EmailCategory category;

  String confidence;

  String summary;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "proposal_json")
  Map<String, Object> proposal;

  @Enumerated(EnumType.STRING)
  EmailHubStatus status;

  @Column(name = "target_module")
  String targetModule;

  @Column(name = "target_id")
  String targetId;

  String note;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
