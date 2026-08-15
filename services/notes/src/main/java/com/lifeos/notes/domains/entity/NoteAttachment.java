package com.lifeos.notes.domains.entity;

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
@Table(name = "note_attachments", schema = "notes_schema")
public class NoteAttachment {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "note_id")
  UUID noteId;

  @Column(name = "file_name")
  String fileName;

  @Column(name = "file_key")
  String fileKey;

  @Column(name = "file_size")
  long fileSize;

  @Column(name = "file_type")
  String fileType;

  @CreationTimestamp
  @Column(name = "upload_date")
  Instant uploadDate;

  @Column(name = "deleted_at")
  Instant deletedAt;
}
