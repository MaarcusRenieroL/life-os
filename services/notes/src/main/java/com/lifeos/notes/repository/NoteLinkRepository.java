package com.lifeos.notes.repository;

import com.lifeos.notes.domains.entity.NoteLink;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoteLinkRepository extends JpaRepository<NoteLink, UUID> {

  List<NoteLink> findAllBySourceNoteId(UUID sourceNoteId);

  // Graph page data source - both endpoints of a link always belong to the
  // same user (links can only be created between two of your own notes), so
  // scoping by the source side's owner is sufficient.
  @Query(
      "SELECT l FROM NoteLink l JOIN Note n ON n.id = l.sourceNoteId "
          + "WHERE n.userId = :userId AND n.deletedAt IS NULL")
  List<NoteLink> findAllForUser(@Param("userId") UUID userId);

  List<NoteLink> findAllByTargetNoteId(UUID targetNoteId);

  Optional<NoteLink> findBySourceNoteIdAndTargetNoteId(UUID sourceNoteId, UUID targetNoteId);

  boolean existsBySourceNoteIdAndTargetNoteId(UUID sourceNoteId, UUID targetNoteId);

  void deleteBySourceNoteIdAndTargetNoteId(UUID sourceNoteId, UUID targetNoteId);
}
