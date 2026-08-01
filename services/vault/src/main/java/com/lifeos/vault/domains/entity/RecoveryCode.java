package com.lifeos.vault.domains.entity;

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
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "recovery_codes", schema = "vault_schema")
public class RecoveryCode {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id")
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "code_hash")
  String codeHash;

  @Column(name = "used")
  boolean used;

  @Column(name = "used_at")
  Instant usedAt;

  @Column(name = "key_salt")
  String keySalt;

  @Column(name = "wrapped_key_ciphertext")
  String wrappedKeyCiphertext;

  @Column(name = "wrapped_key_iv")
  String wrappedKeyIv;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
