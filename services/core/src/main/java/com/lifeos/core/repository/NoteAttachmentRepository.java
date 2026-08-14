package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.NoteAttachment;
import com.lifeos.core.domains.record.AttachmentWithNote;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoteAttachmentRepository extends JpaRepository<NoteAttachment, UUID> {

  List<NoteAttachment> findAllByNoteIdAndDeletedAtIsNull(UUID noteId);

  Optional<NoteAttachment> findByIdAndNoteIdAndDeletedAtIsNull(UUID id, UUID noteId);

  long countByNoteIdAndDeletedAtIsNull(UUID noteId);

  // Note has no JPA relation mapped to NoteAttachment (this codebase keeps
  // entities flat and joins via plain UUID columns) - an explicit ON clause
  // is how JPQL joins two otherwise-unrelated entities, same pattern as
  // NoteRepository.countNotesByFolder.
  @Query(
      "SELECT new com.lifeos.core.domains.record.AttachmentWithNote("
          + "  a.id, a.fileName, a.fileSize, a.fileType, a.uploadDate, a.noteId, n.title"
          + ") FROM NoteAttachment a JOIN Note n ON n.id = a.noteId "
          + "WHERE n.userId = :userId AND a.deletedAt IS NULL AND n.deletedAt IS NULL "
          + "ORDER BY a.uploadDate DESC")
  List<AttachmentWithNote> findAllForUser(@Param("userId") UUID userId);
}
