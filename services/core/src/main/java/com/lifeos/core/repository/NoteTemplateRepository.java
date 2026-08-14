package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.NoteTemplate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteTemplateRepository extends JpaRepository<NoteTemplate, UUID> {

  Page<NoteTemplate> findAllByUserId(UUID userId, Pageable pageable);

  Page<NoteTemplate> findAllByUserIdAndCategory(UUID userId, String category, Pageable pageable);

  Optional<NoteTemplate> findByIdAndUserId(UUID id, UUID userId);

  List<NoteTemplate> findAllByUserId(UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);

  void deleteAllByUserId(UUID userId);
}
