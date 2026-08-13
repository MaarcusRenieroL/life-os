package com.lifeos.core.service;

import com.lifeos.core.domains.entity.Note;
import com.lifeos.core.domains.entity.NoteFolderAssignment;
import com.lifeos.core.domains.entity.NoteTag;
import com.lifeos.core.domains.enums.NoteType;
import jakarta.persistence.criteria.Subquery;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class NoteSpecifications {

  private NoteSpecifications() {}

  public static Specification<Note> userId(UUID userId) {
    return (root, query, cb) -> cb.equal(root.get("userId"), userId);
  }

  public static Specification<Note> notDeleted() {
    return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
  }

  public static Specification<Note> archived(boolean archived) {
    return (root, query, cb) -> cb.equal(root.get("isArchived"), archived);
  }

  public static Specification<Note> favorite(boolean favorite) {
    return (root, query, cb) -> cb.equal(root.get("isFavorite"), favorite);
  }

  public static Specification<Note> noteType(NoteType noteType) {
    return (root, query, cb) -> cb.equal(root.get("noteType"), noteType);
  }

  public static Specification<Note> inFolder(UUID folderId) {
    return (root, query, cb) -> {
      Subquery<UUID> subquery = query.subquery(UUID.class);
      var nfa = subquery.from(NoteFolderAssignment.class);
      subquery.select(nfa.get("noteId")).where(cb.equal(nfa.get("folderId"), folderId));

      return root.get("id").in(subquery);
    };
  }

  public static Specification<Note> hasTag(UUID tagId) {
    return (root, query, cb) -> {
      Subquery<UUID> subquery = query.subquery(UUID.class);
      var nt = subquery.from(NoteTag.class);
      subquery.select(nt.get("noteId")).where(cb.equal(nt.get("tagId"), tagId));

      return root.get("id").in(subquery);
    };
  }
}
