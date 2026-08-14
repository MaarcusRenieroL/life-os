package com.lifeos.core.domains.entity;

import com.lifeos.core.domains.enums.NoteType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "note_user_settings", schema = "core_schema")
public class NoteUserSettings {

  @Id
  @Column(name = "user_id")
  UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "default_note_type")
  NoteType defaultNoteType;

  @Column(name = "auto_archive_enabled")
  boolean autoArchiveEnabled;

  @Column(name = "auto_archive_days")
  int autoArchiveDays;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
