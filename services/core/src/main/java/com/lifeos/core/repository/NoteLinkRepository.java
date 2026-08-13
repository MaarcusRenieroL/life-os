package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.NoteLink;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteLinkRepository extends JpaRepository<NoteLink, UUID> {

  List<NoteLink> findAllBySourceNoteId(UUID sourceNoteId);

  List<NoteLink> findAllByTargetNoteId(UUID targetNoteId);

  Optional<NoteLink> findBySourceNoteIdAndTargetNoteId(UUID sourceNoteId, UUID targetNoteId);

  boolean existsBySourceNoteIdAndTargetNoteId(UUID sourceNoteId, UUID targetNoteId);

  void deleteBySourceNoteIdAndTargetNoteId(UUID sourceNoteId, UUID targetNoteId);
}
