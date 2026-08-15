package com.lifeos.notes.service;

import com.lifeos.notes.domains.dto.request.UpdateNoteSettingsRequest;
import com.lifeos.notes.domains.dto.response.NoteSettingsResponse;
import com.lifeos.notes.domains.entity.NoteUserSettings;
import com.lifeos.notes.domains.enums.NoteType;
import com.lifeos.notes.repository.NoteFolderRepository;
import com.lifeos.notes.repository.NoteRepository;
import com.lifeos.notes.repository.NoteTemplateRepository;
import com.lifeos.notes.repository.NoteUserSettingsRepository;
import com.lifeos.notes.repository.TagRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteSettingsService {

  private static final int DEFAULT_AUTO_ARCHIVE_DAYS = 90;

  private final NoteUserSettingsRepository noteUserSettingsRepository;
  private final NoteRepository noteRepository;
  private final NoteFolderRepository noteFolderRepository;
  private final TagRepository tagRepository;
  private final NoteTemplateRepository noteTemplateRepository;

  public NoteSettingsResponse get(UUID userId) {
    return toResponse(getOrCreate(userId));
  }

  public NoteSettingsResponse update(UUID userId, UpdateNoteSettingsRequest request) {
    NoteUserSettings settings = getOrCreate(userId);

    if (request.getDefaultNoteType() != null) {
      settings.setDefaultNoteType(request.getDefaultNoteType());
    }

    if (request.getAutoArchiveEnabled() != null) {
      settings.setAutoArchiveEnabled(request.getAutoArchiveEnabled());
    }

    if (request.getAutoArchiveDays() != null) {
      settings.setAutoArchiveDays(request.getAutoArchiveDays());
    }

    return toResponse(noteUserSettingsRepository.saveAndFlush(settings));
  }

  // Danger zone: permanently deletes every note (regardless of archived or
  // trashed state - notes' own cascading FKs clean up tags/folders
  // assignments/links/attachments/versions), every folder, every
  // user-created tag, and every template. Does not touch the settings row
  // itself, so auto-archive/default-type preferences survive a wipe.
  public void deleteAllUserData(UUID userId) {
    noteRepository.deleteAll(noteRepository.findAllByUserId(userId));
    noteFolderRepository.deleteAllByUserId(userId);
    tagRepository.deleteAllByUserId(userId);
    noteTemplateRepository.deleteAllByUserId(userId);
  }

  // Package-private for NoteAutoArchiveScheduler - the settings row is
  // created lazily on first read/write rather than at signup, so the
  // scheduler needs the same get-or-create semantics as the API path.
  NoteUserSettings getOrCreate(UUID userId) {
    return noteUserSettingsRepository
        .findByUserId(userId)
        .orElseGet(
            () ->
                noteUserSettingsRepository.saveAndFlush(
                    NoteUserSettings.builder()
                        .userId(userId)
                        .defaultNoteType(NoteType.GENERAL)
                        .autoArchiveEnabled(false)
                        .autoArchiveDays(DEFAULT_AUTO_ARCHIVE_DAYS)
                        .build()));
  }

  private NoteSettingsResponse toResponse(NoteUserSettings settings) {
    return NoteSettingsResponse.builder()
        .defaultNoteType(settings.getDefaultNoteType())
        .autoArchiveEnabled(settings.isAutoArchiveEnabled())
        .autoArchiveDays(settings.getAutoArchiveDays())
        .build();
  }
}
