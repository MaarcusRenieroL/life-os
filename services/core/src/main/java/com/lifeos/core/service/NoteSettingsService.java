package com.lifeos.core.service;

import com.lifeos.core.domains.dto.request.UpdateNoteSettingsRequest;
import com.lifeos.core.domains.dto.response.NoteSettingsResponse;
import com.lifeos.core.domains.entity.NoteUserSettings;
import com.lifeos.core.domains.enums.NoteType;
import com.lifeos.core.repository.NoteUserSettingsRepository;
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
