package com.lifeos.notes.service;

import com.lifeos.notes.domains.entity.Note;
import com.lifeos.notes.domains.entity.NoteLink;
import com.lifeos.notes.domains.enums.NoteLinkType;
import com.lifeos.notes.exception.NoteConflictException;
import com.lifeos.notes.exception.NoteNotFoundException;
import com.lifeos.notes.exception.NoteValidationException;
import com.lifeos.notes.repository.NoteLinkRepository;
import com.lifeos.notes.repository.NoteRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteLinkService {

  private final NoteLinkRepository noteLinkRepository;
  private final NoteRepository noteRepository;

  // A link shows up on BOTH notes' detail responses - as an outgoing link on
  // the source and as a backlink on the target - so both cached entries have
  // to go, not just the source's.
  @Caching(
      evict = {
        @CacheEvict(
            value = NoteService.NOTE_DETAIL_CACHE,
            key = "#userId + ':' + #sourceNoteId"),
        @CacheEvict(value = NoteService.NOTE_DETAIL_CACHE, key = "#userId + ':' + #targetNoteId")
      })
  public void addLink(UUID userId, UUID sourceNoteId, UUID targetNoteId) {
    if (sourceNoteId.equals(targetNoteId)) {
      throw new NoteValidationException("Cannot link a note to itself");
    }

    requireOwned(userId, sourceNoteId);

    Note target =
        noteRepository
            .findByIdAndUserIdAndDeletedAtIsNull(targetNoteId, userId)
            .orElseThrow(() -> new NoteNotFoundException(targetNoteId));

    if (noteLinkRepository.existsBySourceNoteIdAndTargetNoteId(sourceNoteId, targetNoteId)) {
      throw new NoteConflictException("This link already exists");
    }

    noteLinkRepository.save(
        NoteLink.builder()
            .sourceNoteId(sourceNoteId)
            .targetNoteId(target.getId())
            .linkType(NoteLinkType.INTERNAL_LINK)
            .build());
  }

  @Caching(
      evict = {
        @CacheEvict(
            value = NoteService.NOTE_DETAIL_CACHE,
            key = "#userId + ':' + #sourceNoteId"),
        @CacheEvict(value = NoteService.NOTE_DETAIL_CACHE, key = "#userId + ':' + #targetNoteId")
      })
  public void removeLink(UUID userId, UUID sourceNoteId, UUID targetNoteId) {
    requireOwned(userId, sourceNoteId);
    noteLinkRepository.deleteBySourceNoteIdAndTargetNoteId(sourceNoteId, targetNoteId);
  }

  private void requireOwned(UUID userId, UUID noteId) {
    noteRepository
        .findByIdAndUserIdAndDeletedAtIsNull(noteId, userId)
        .orElseThrow(() -> new NoteNotFoundException(noteId));
  }
}
