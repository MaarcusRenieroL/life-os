package com.lifeos.notes.service;

import com.lifeos.notes.domains.dto.response.NoteModuleLinkResponse;
import com.lifeos.notes.domains.entity.NoteModuleLink;
import com.lifeos.notes.domains.enums.NoteModuleType;
import com.lifeos.notes.exception.NoteConflictException;
import com.lifeos.notes.exception.NoteNotFoundException;
import com.lifeos.notes.repository.NoteModuleLinkRepository;
import com.lifeos.notes.repository.NoteRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteModuleLinkService {

  private final NoteModuleLinkRepository noteModuleLinkRepository;
  private final NoteRepository noteRepository;

  /**
   * An item in another module (a goal, a task...) was deleted: its links disappear from the notes that had
   * them. The detail cache holds module links, so it is cleared whole (this runs rarely).
   */
  @CacheEvict(value = NoteService.NOTE_DETAIL_CACHE, allEntries = true)
  public int removeAllForModule(UUID userId, NoteModuleType moduleType, UUID moduleId) {
    return noteModuleLinkRepository.deleteForModule(userId, moduleType, moduleId);
  }

  // moduleLinks is part of the note-detail payload.
  @CacheEvict(
      value = NoteService.NOTE_DETAIL_CACHE,
      key = NoteService.NOTE_DETAIL_KEY_BY_NOTE_ID)
  public NoteModuleLinkResponse addLink(
      UUID userId, UUID noteId, NoteModuleType moduleType, UUID moduleId) {
    requireOwned(userId, noteId);

    if (noteModuleLinkRepository.existsByNoteIdAndModuleTypeAndModuleId(noteId, moduleType, moduleId)) {
      throw new NoteConflictException("This module link already exists");
    }

    NoteModuleLink link =
        noteModuleLinkRepository.saveAndFlush(
            NoteModuleLink.builder().noteId(noteId).moduleType(moduleType).moduleId(moduleId).build());

    return toResponse(link);
  }

  @CacheEvict(
      value = NoteService.NOTE_DETAIL_CACHE,
      key = NoteService.NOTE_DETAIL_KEY_BY_NOTE_ID)
  public void removeLink(UUID userId, UUID noteId, UUID linkId) {
    requireOwned(userId, noteId);
    noteModuleLinkRepository.deleteByIdAndNoteId(linkId, noteId);
  }

  @Transactional(readOnly = true)
  public List<NoteModuleLinkResponse> listForNote(UUID userId, UUID noteId) {
    requireOwned(userId, noteId);
    return noteModuleLinkRepository.findAllByNoteId(noteId).stream().map(this::toResponse).toList();
  }

  private void requireOwned(UUID userId, UUID noteId) {
    noteRepository
        .findByIdAndUserIdAndDeletedAtIsNull(noteId, userId)
        .orElseThrow(() -> new NoteNotFoundException(noteId));
  }

  private NoteModuleLinkResponse toResponse(NoteModuleLink link) {
    return NoteModuleLinkResponse.builder()
        .id(link.getId())
        .moduleType(link.getModuleType())
        .moduleId(link.getModuleId())
        .createdAt(link.getCreatedAt())
        .build();
  }
}
