package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.NoteAttachment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteAttachmentRepository extends JpaRepository<NoteAttachment, UUID> {

  List<NoteAttachment> findAllByNoteIdAndDeletedAtIsNull(UUID noteId);

  Optional<NoteAttachment> findByIdAndNoteIdAndDeletedAtIsNull(UUID id, UUID noteId);

  long countByNoteIdAndDeletedAtIsNull(UUID noteId);
}
