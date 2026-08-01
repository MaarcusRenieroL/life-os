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
import org.hibernate.annotations.CreationTimestamp;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "biometric_enrollments", schema = "auth_schema")
public class BiometricEnrollment {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id")
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "device_id")
  String deviceId;

  @Column(name = "public_key")
  String publicKey;

  @Column(name = "type")
  String type;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
