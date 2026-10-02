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
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "vault_master_passwords", schema = "vault_schema")
public class VaultMasterPassword {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id")
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "password_hash")
  String passwordHash;

  @Column(name = "salt")
  String salt;

  @Column(name = "strength")
  String strength;

  /** PBKDF2 iterations the vault key was derived with; null on rows from before this was stored (65,536). */
  @Column(name = "kdf_iterations")
  Integer kdfIterations;

  public int effectiveKdfIterations() {
    return kdfIterations == null ? 65536 : kdfIterations;
  }

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
