package com.lifeos.notes.repository;

import com.lifeos.notes.domains.entity.NoteVersion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteVersionRepository extends JpaRepository<NoteVersion, UUID> {

  List<NoteVersion> findAllByNoteIdOrderByVersionNumberDesc(UUID noteId);

  Optional<NoteVersion> findTopByNoteIdOrderByVersionNumberDesc(UUID noteId);

  Optional<NoteVersion> findByNoteIdAndVersionNumber(UUID noteId, int versionNumber);
}
