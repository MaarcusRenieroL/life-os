package com.lifeos.core.service;

import com.lifeos.core.domains.dto.response.NoteModuleLinkResponse;
import com.lifeos.core.domains.entity.NoteModuleLink;
import com.lifeos.core.domains.enums.NoteModuleType;
import com.lifeos.core.exception.NoteConflictException;
import com.lifeos.core.exception.NoteNotFoundException;
import com.lifeos.core.repository.NoteModuleLinkRepository;
import com.lifeos.core.repository.NoteRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteModuleLinkService {

  private final NoteModuleLinkRepository noteModuleLinkRepository;
  private final NoteRepository noteRepository;

  public NoteModuleLinkResponse addLink(
      UUID userId, UUID noteId, NoteModuleType moduleType, UUID moduleId) {
    requireOwned(userId, noteId);

    if (noteModuleLinkRepository.existsByNoteIdAndModuleTypeAndModuleId(noteId, moduleType, moduleId)) {
      throw new NoteConflictException("This module link already exists");
    }

    NoteModuleLink link =
        noteModuleLinkRepository.save(
            NoteModuleLink.builder().noteId(noteId).moduleType(moduleType).moduleId(moduleId).build());

    return toResponse(link);
  }

  public void removeLink(UUID userId, UUID noteId, UUID linkId) {
    requireOwned(userId, noteId);
    noteModuleLinkRepository.deleteByIdAndNoteId(linkId, noteId);
  }

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
