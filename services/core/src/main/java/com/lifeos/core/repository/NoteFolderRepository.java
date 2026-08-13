package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.NoteFolder;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteFolderRepository extends JpaRepository<NoteFolder, UUID> {

  List<NoteFolder> findAllByUserId(UUID userId);

  Optional<NoteFolder> findByIdAndUserId(UUID id, UUID userId);

  boolean existsByUserIdAndParentFolderIdAndName(UUID userId, UUID parentFolderId, String name);

  boolean existsByUserIdAndParentFolderIdIsNullAndName(UUID userId, String name);

  List<NoteFolder> findAllByParentFolderId(UUID parentFolderId);

  void deleteByIdAndUserId(UUID id, UUID userId);
}
