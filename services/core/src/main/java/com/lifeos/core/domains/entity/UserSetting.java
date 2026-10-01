package com.lifeos.core.domains.entity;

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

/** A single (module, key) -> value setting for a user. Unlike {@link UserModuleSetting} (a
 * dedicated boolean for module enable/disable), this is the generic store for everything else -
 * default reminder time, budget alert threshold, auto-lock timeout, and so on. Value is stored as
 * plain text; callers parse it to whatever type the setting actually is (each module owns the
 * meaning of its own keys) - this table doesn't know or care what's in it. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "user_settings", schema = "core_schema")
public class UserSetting {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "id")
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "module")
  String module;

  @Column(name = "key")
  String key;

  @Column(name = "value")
  String value;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
