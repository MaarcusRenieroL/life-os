package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.Tag;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TagRepository extends JpaRepository<Tag, UUID> {

  List<Tag> findAllByUserId(UUID userId);

  List<Tag> findAllByUserIdAndNameContainingIgnoreCase(UUID userId, String search);

  List<Tag> findAllByUserIdAndNameStartingWithIgnoreCase(UUID userId, String prefix);

  Optional<Tag> findByIdAndUserId(UUID id, UUID userId);

  Optional<Tag> findByUserIdAndNameIgnoreCase(UUID userId, String name);

  void deleteByIdAndUserId(UUID id, UUID userId);

  @Query(
      "SELECT nt.tagId as tagId, COUNT(nt) as usageCount FROM NoteTag nt "
          + "WHERE nt.tagId IN :tagIds GROUP BY nt.tagId")
  List<TagUsage> countUsageForTags(@Param("tagIds") List<UUID> tagIds);

  interface TagUsage {
    UUID getTagId();

    long getUsageCount();
  }

  void deleteAllByUserId(UUID userId);
}
