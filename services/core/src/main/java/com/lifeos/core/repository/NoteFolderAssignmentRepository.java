package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.NoteFolderAssignment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteFolderAssignmentRepository extends JpaRepository<NoteFolderAssignment, UUID> {

  List<NoteFolderAssignment> findAllByNoteId(UUID noteId);

  List<NoteFolderAssignment> findAllByNoteIdIn(List<UUID> noteIds);

  List<NoteFolderAssignment> findAllByFolderId(UUID folderId);

  boolean existsByFolderId(UUID folderId);

  void deleteByNoteIdAndFolderId(UUID noteId, UUID folderId);

  void deleteAllByNoteId(UUID noteId);

  long countByFolderId(UUID folderId);
}
