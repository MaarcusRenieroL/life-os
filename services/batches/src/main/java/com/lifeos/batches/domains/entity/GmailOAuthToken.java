package com.lifeos.batches.domains.entity;

import com.lifeos.batches.domains.enums.GmailPurpose;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "gmail_oauth_tokens", schema = "batches_schema")
public class GmailOAuthToken {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  @Enumerated(EnumType.STRING)
  GmailPurpose purpose;

  // The mailbox these tokens belong to (null on connections made before purposes existed).
  String email;

  // Combined "iv:ciphertext" (both base64) - see common.security.EncryptionService.
  String accessTokenEncrypted;

  String refreshTokenEncrypted;

  Instant expiresAt;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
