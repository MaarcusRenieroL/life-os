package com.lifeos.notes.repository;

import com.lifeos.notes.domains.entity.NoteModuleLink;
import com.lifeos.notes.domains.enums.NoteModuleType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteModuleLinkRepository extends JpaRepository<NoteModuleLink, UUID> {

  List<NoteModuleLink> findAllByNoteId(UUID noteId);

  List<NoteModuleLink> findAllByModuleTypeAndModuleId(NoteModuleType moduleType, UUID moduleId);

  Optional<NoteModuleLink> findByIdAndNoteId(UUID id, UUID noteId);

  boolean existsByNoteIdAndModuleTypeAndModuleId(
      UUID noteId, NoteModuleType moduleType, UUID moduleId);

  void deleteByIdAndNoteId(UUID id, UUID noteId);
}
