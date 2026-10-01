package com.lifeos.notes.repository;

import com.lifeos.notes.domains.entity.NoteModuleLink;
import com.lifeos.notes.domains.enums.NoteModuleType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;

public interface NoteModuleLinkRepository extends JpaRepository<NoteModuleLink, UUID> {

  List<NoteModuleLink> findAllByNoteId(UUID noteId);

  List<NoteModuleLink> findAllByNoteIdIn(java.util.Collection<UUID> noteIds);

  List<NoteModuleLink> findAllByModuleTypeAndModuleId(NoteModuleType moduleType, UUID moduleId);

  Optional<NoteModuleLink> findByIdAndNoteId(UUID id, UUID noteId);

  boolean existsByNoteIdAndModuleTypeAndModuleId(
      UUID noteId, NoteModuleType moduleType, UUID moduleId);

  void deleteByIdAndNoteId(UUID id, UUID noteId);

  /** Drops every link from this user's notes to an item that no longer exists. */
  @Modifying
  @Query(
      "delete from NoteModuleLink l where l.moduleType = :type and l.moduleId = :moduleId"
          + " and l.noteId in (select n.id from Note n where n.userId = :userId)")
  int deleteForModule(@Param("userId") UUID userId, @Param("type") NoteModuleType type, @Param("moduleId") UUID moduleId);
}
