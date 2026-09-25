package com.lifeos.notes.repository;

import com.lifeos.notes.domains.entity.NoteVersion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteVersionRepository extends JpaRepository<NoteVersion, UUID> {

  // Exhaustive history, for the dedicated GET /v1/notes/{id}/versions endpoint.
  List<NoteVersion> findAllByNoteIdOrderByVersionNumberDesc(UUID noteId);

  // Bounded companion for the inline version list on the note-detail
  // response: a note edited for months accumulates unbounded history, and
  // shipping all of it on every read is both a slow query and a huge payload.
  List<NoteVersion> findTop20ByNoteIdOrderByVersionNumberDesc(UUID noteId);

  Optional<NoteVersion> findTopByNoteIdOrderByVersionNumberDesc(UUID noteId);

  Optional<NoteVersion> findByNoteIdAndVersionNumber(UUID noteId, int versionNumber);
}
