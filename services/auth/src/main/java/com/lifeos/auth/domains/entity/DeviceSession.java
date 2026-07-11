package com.lifeos.auth.domains.entity;

import jakarta.persistence.Column;
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

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "device_sessions", schema = "auth_schema")
public class DeviceSession {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id")
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "device_name")
  String deviceName;

  @Column(name = "device_type")
  String deviceType;

  @Column(name = "created_at")
  Instant createdAt;

  @Column(name = "last_active_at")
  Instant lastActiveAt;

  @Column(name = "revoked_at")
  Instant revokedAt;
}
