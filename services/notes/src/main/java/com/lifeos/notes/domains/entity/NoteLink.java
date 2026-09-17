package com.lifeos.notes.domains.entity;

import com.lifeos.notes.domains.enums.NoteLinkType;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "note_links", schema = "notes_schema")
public class NoteLink {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "source_note_id")
  UUID sourceNoteId;

  @Column(name = "target_note_id")
  UUID targetNoteId;

  @Enumerated(EnumType.STRING)
  @Column(name = "link_type")
  NoteLinkType linkType;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
