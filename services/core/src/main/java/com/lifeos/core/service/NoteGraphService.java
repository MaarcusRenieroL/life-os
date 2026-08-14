package com.lifeos.core.service;

import com.lifeos.core.domains.dto.response.GraphEdgeResponse;
import com.lifeos.core.domains.dto.response.GraphNodeResponse;
import com.lifeos.core.domains.dto.response.NoteGraphResponse;
import com.lifeos.core.domains.entity.Note;
import com.lifeos.core.domains.entity.NoteFolder;
import com.lifeos.core.domains.entity.NoteFolderAssignment;
import com.lifeos.core.domains.entity.NoteLink;
import com.lifeos.core.domains.entity.NoteTag;
import com.lifeos.core.repository.NoteFolderAssignmentRepository;
import com.lifeos.core.repository.NoteFolderRepository;
import com.lifeos.core.repository.NoteLinkRepository;
import com.lifeos.core.repository.NoteRepository;
import com.lifeos.core.repository.NoteTagRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoteGraphService {

  private final NoteRepository noteRepository;
  private final NoteLinkRepository noteLinkRepository;
  private final NoteFolderAssignmentRepository noteFolderAssignmentRepository;
  private final NoteFolderRepository noteFolderRepository;
  private final NoteTagRepository noteTagRepository;

  public NoteGraphResponse build(UUID userId) {
    List<Note> notes = noteRepository.findAllByUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(
        userId, org.springframework.data.domain.Pageable.unpaged());

    List<NoteLink> links = noteLinkRepository.findAllForUser(userId);

    Map<UUID, Long> connectionCounts = new HashMap<>();
    for (NoteLink link : links) {
      connectionCounts.merge(link.getSourceNoteId(), 1L, Long::sum);
      connectionCounts.merge(link.getTargetNoteId(), 1L, Long::sum);
    }

    List<UUID> noteIds = notes.stream().map(Note::getId).toList();
    Map<UUID, UUID> firstFolderByNote = new HashMap<>();
    for (NoteFolderAssignment assignment : noteFolderAssignmentRepository.findAllByNoteIdIn(noteIds)) {
      firstFolderByNote.putIfAbsent(assignment.getNoteId(), assignment.getFolderId());
    }

    Map<UUID, String> folderNames = new HashMap<>();
    for (NoteFolder folder : noteFolderRepository.findAllByUserId(userId)) {
      folderNames.put(folder.getId(), folder.getName());
    }

    Map<UUID, List<UUID>> tagsByNote = new HashMap<>();
    for (NoteTag noteTag : noteTagRepository.findAllByNoteIdIn(noteIds)) {
      tagsByNote.computeIfAbsent(noteTag.getNoteId(), k -> new ArrayList<>()).add(noteTag.getTagId());
    }

    List<GraphNodeResponse> nodes =
        notes.stream()
            .map(
                note -> {
                  UUID folderId = firstFolderByNote.get(note.getId());
                  return GraphNodeResponse.builder()
                      .id(note.getId())
                      .title(note.getTitle())
                      .noteType(note.getNoteType() != null ? note.getNoteType().name() : "GENERAL")
                      .folderId(folderId)
                      .folderName(folderId != null ? folderNames.get(folderId) : null)
                      .connectionCount(connectionCounts.getOrDefault(note.getId(), 0L).intValue())
                      .tagIds(tagsByNote.getOrDefault(note.getId(), List.of()))
                      .build();
                })
            .toList();

    List<GraphEdgeResponse> edges =
        links.stream()
            .map(
                link ->
                    GraphEdgeResponse.builder()
                        .sourceId(link.getSourceNoteId())
                        .targetId(link.getTargetNoteId())
                        .build())
            .toList();

    return NoteGraphResponse.builder().nodes(nodes).edges(edges).build();
  }
}
