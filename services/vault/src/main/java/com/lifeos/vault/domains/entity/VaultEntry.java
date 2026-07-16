package com.lifeos.vault.domains.entity;

import com.lifeos.vault.domains.enums.VaultEntryType;
import jakarta.persistence.Column;
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
@Table(name = "vault_entries", schema = "vault_schema")
public class VaultEntry {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id")
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "type")
  VaultEntryType type;

  @Column(name = "title")
  String title;

  @Column(name = "email")
  String email;

  @Column(name = "username")
  String username;

  @Column(name = "url")
  String url;

  @Column(name = "icon")
  String icon;

  @Column(name = "password_encrypted")
  String passwordEncrypted;

  @Column(name = "password_iv")
  String passwordIv;

  @Column(name = "notes_encrypted")
  String notesEncrypted;

  @Column(name = "notes_iv")
  String notesIv;

  @Column(name = "category_id")
  UUID categoryId;

  @Column(name = "is_favorite")
  boolean favorite;

  @Column(name = "expires_at")
  Instant expiresAt;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
