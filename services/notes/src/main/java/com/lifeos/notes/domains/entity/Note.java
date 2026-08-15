package com.lifeos.notes.domains.entity;

import com.lifeos.notes.domains.enums.NoteType;
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
@Table(name = "notes", schema = "notes_schema")
public class Note {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "parent_note_id")
  UUID parentNoteId;

  String title;

  String content;

  @Column(name = "content_plain_text")
  String contentPlainText;

  String description;

  @Column(name = "is_pinned")
  boolean isPinned;

  @Column(name = "is_archived")
  boolean isArchived;

  @Column(name = "is_favorite")
  boolean isFavorite;

  @Enumerated(EnumType.STRING)
  @Column(name = "note_type")
  NoteType noteType;

  @Column(name = "content_version")
  int contentVersion;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;

  @Column(name = "deleted_at")
  Instant deletedAt;
}
