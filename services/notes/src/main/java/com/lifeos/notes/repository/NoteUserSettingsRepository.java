package com.lifeos.notes.repository;

import com.lifeos.notes.domains.entity.NoteUserSettings;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteUserSettingsRepository extends JpaRepository<NoteUserSettings, UUID> {

  Optional<NoteUserSettings> findByUserId(UUID userId);

  List<NoteUserSettings> findAllByAutoArchiveEnabledTrue();
}
