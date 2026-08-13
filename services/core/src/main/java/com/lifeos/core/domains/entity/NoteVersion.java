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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "note_versions", schema = "core_schema")
public class NoteVersion {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "note_id")
  UUID noteId;

  @Column(name = "version_number")
  int versionNumber;

  String content;

  @Column(name = "content_plain_text")
  String contentPlainText;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @Column(name = "created_by")
  UUID createdBy;
}
