package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.Note;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoteRepository extends JpaRepository<Note, UUID>, JpaSpecificationExecutor<Note> {

  Optional<Note> findByIdAndUserId(UUID id, UUID userId);

  Optional<Note> findByIdAndUserIdAndDeletedAtIsNull(UUID id, UUID userId);

  List<Note> findAllByUserIdAndIsPinnedTrueAndDeletedAtIsNullAndIsArchivedFalse(UUID userId);

  List<Note> findAllByUserIdAndIsFavoriteTrueAndDeletedAtIsNullAndIsArchivedFalse(UUID userId);

  Page<Note> findAllByUserIdAndDeletedAtIsNullAndIsArchivedFalseOrderByUpdatedAtDesc(
      UUID userId, Pageable pageable);

  List<Note> findAllByParentNoteIdAndDeletedAtIsNull(UUID parentNoteId);

  long countByUserIdAndDeletedAtIsNull(UUID userId);

  @Query(
      value =
          "SELECT n.* FROM core_schema.notes n "
              + "WHERE n.user_id = :userId AND n.deleted_at IS NULL "
              + "AND n.search_vector @@ websearch_to_tsquery('english', :query) "
              + "ORDER BY ts_rank(n.search_vector, websearch_to_tsquery('english', :query)) DESC",
      countQuery =
          "SELECT count(*) FROM core_schema.notes n "
              + "WHERE n.user_id = :userId AND n.deleted_at IS NULL "
              + "AND n.search_vector @@ websearch_to_tsquery('english', :query)",
      nativeQuery = true)
  Page<Note> searchByFullText(
      @Param("userId") UUID userId, @Param("query") String query, Pageable pageable);

  @Query(
      "SELECT nfa.folderId as folderId, COUNT(n) as noteCount FROM Note n "
          + "JOIN NoteFolderAssignment nfa ON nfa.noteId = n.id "
          + "WHERE n.userId = :userId AND n.deletedAt IS NULL "
          + "GROUP BY nfa.folderId")
  List<FolderNoteCount> countNotesByFolder(@Param("userId") UUID userId);

  interface FolderNoteCount {
    UUID getFolderId();

    long getNoteCount();
  }

  List<Note> findAllByUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(UUID userId, Pageable pageable);

  // Danger-zone wipe target - every note regardless of archived/trashed
  // state, since "delete all notes data" means all of it.
  List<Note> findAllByUserId(UUID userId);

  List<Note> findAllByUserIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(UUID userId);

  Optional<Note> findByIdAndUserIdAndDeletedAtIsNotNull(UUID id, UUID userId);

  // Trash-purge scheduler target - notes soft-deleted before the retention
  // cutoff, across all users (the job itself is what scopes/iterates users).
  List<Note> findAllByDeletedAtBefore(Instant cutoff);

  // Auto-archive scheduler target for a single user.
  List<Note> findAllByUserIdAndIsArchivedFalseAndDeletedAtIsNullAndUpdatedAtBefore(
      UUID userId, Instant cutoff);
}
