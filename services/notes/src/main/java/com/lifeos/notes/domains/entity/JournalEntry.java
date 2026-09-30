package com.lifeos.notes.domains.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** The journal-only fields of a note with noteType JOURNAL - one row per such note, keyed by the
 * note's own id. The note's content is rendered from this (see JournalContentBuilder). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "journal_entries", schema = "notes_schema")
public class JournalEntry {

  @Id
  @Column(name = "note_id")
  UUID noteId;

  @Column(name = "entry_date")
  LocalDate entryDate;

  // 1-5, null when the user didn't say.
  Integer mood;

  Integer energy;

  @Column(name = "free_writing")
  String freeWriting;

  // Each entry is {"prompt": "...", "answer": "..."}.
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "prompt_answers", columnDefinition = "jsonb")
  List<Map<String, String>> promptAnswers;
}
