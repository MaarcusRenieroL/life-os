package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.NoteTag;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteTagRepository extends JpaRepository<NoteTag, UUID> {

  List<NoteTag> findAllByNoteId(UUID noteId);

  List<NoteTag> findAllByNoteIdIn(List<UUID> noteIds);

  boolean existsByNoteIdAndTagId(UUID noteId, UUID tagId);

  void deleteByNoteIdAndTagId(UUID noteId, UUID tagId);

  void deleteAllByNoteId(UUID noteId);

  long countByTagId(UUID tagId);
}
