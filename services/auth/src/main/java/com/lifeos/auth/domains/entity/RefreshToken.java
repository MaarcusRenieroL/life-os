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
@Table(name = "refresh_tokens", schema = "auth_schema")
public class RefreshToken {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id")
  UUID id;

  @Column(name = "device_session_id")
  UUID deviceSessionId;

  @Column(name = "token_hash")
  String tokenHash;

  @Column(name = "expires_at")
  Instant expiresAt;

  @Column(name = "revoked_at")
  Instant revokedAt;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
