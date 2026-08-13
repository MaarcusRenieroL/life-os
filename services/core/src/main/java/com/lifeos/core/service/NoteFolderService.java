package com.lifeos.core.service;

import com.lifeos.core.domains.dto.request.CreateFolderRequest;
import com.lifeos.core.domains.dto.request.RenameFolderRequest;
import com.lifeos.core.domains.dto.response.FolderResponse;
import com.lifeos.core.domains.entity.NoteFolder;
import com.lifeos.core.domains.entity.NoteFolderAssignment;
import com.lifeos.core.exception.NoteConflictException;
import com.lifeos.core.exception.NoteFolderNotFoundException;
import com.lifeos.core.repository.NoteFolderAssignmentRepository;
import com.lifeos.core.repository.NoteFolderRepository;
import com.lifeos.core.repository.NoteRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteFolderService {

  private final NoteFolderRepository noteFolderRepository;
  private final NoteFolderAssignmentRepository noteFolderAssignmentRepository;
  private final NoteRepository noteRepository;

  @Cacheable(value = "user-folders", key = "#userId")
  public List<FolderResponse> getTree(UUID userId) {
    List<NoteFolder> all = noteFolderRepository.findAllByUserId(userId);
    Map<UUID, Long> counts =
        noteRepository.countNotesByFolder(userId).stream()
            .collect(
                Collectors.toMap(
                    NoteRepository.FolderNoteCount::getFolderId,
                    NoteRepository.FolderNoteCount::getNoteCount));

    Map<UUID, List<NoteFolder>> byParent =
        all.stream()
            .filter(f -> f.getParentFolderId() != null)
            .collect(Collectors.groupingBy(NoteFolder::getParentFolderId));

    List<NoteFolder> roots = all.stream().filter(f -> f.getParentFolderId() == null).toList();

    return roots.stream().map(root -> toTree(root, byParent, counts)).toList();
  }

  private FolderResponse toTree(
      NoteFolder folder, Map<UUID, List<NoteFolder>> byParent, Map<UUID, Long> counts) {
    List<FolderResponse> children =
        byParent.getOrDefault(folder.getId(), List.of()).stream()
            .map(child -> toTree(child, byParent, counts))
            .toList();

    return FolderResponse.builder()
        .id(folder.getId())
        .name(folder.getName())
        .parentFolderId(folder.getParentFolderId())
        .noteCount(counts.getOrDefault(folder.getId(), 0L))
        .createdAt(folder.getCreatedAt())
        .updatedAt(folder.getUpdatedAt())
        .children(children)
        .build();
  }

  @CacheEvict(value = "user-folders", key = "#userId")
  public FolderResponse create(UUID userId, CreateFolderRequest request) {
    if (request.getParentFolderId() != null) {
      noteFolderRepository
          .findByIdAndUserId(request.getParentFolderId(), userId)
          .orElseThrow(() -> new NoteFolderNotFoundException(request.getParentFolderId()));
    }

    boolean exists =
        request.getParentFolderId() == null
            ? noteFolderRepository.existsByUserIdAndParentFolderIdIsNullAndName(
                userId, request.getName())
            : noteFolderRepository.existsByUserIdAndParentFolderIdAndName(
                userId, request.getParentFolderId(), request.getName());

    if (exists) {
      throw new NoteConflictException("Folder already exists");
    }

    NoteFolder folder =
        NoteFolder.builder()
            .userId(userId)
            .parentFolderId(request.getParentFolderId())
            .name(request.getName())
            .build();

    NoteFolder saved = noteFolderRepository.saveAndFlush(folder);

    return FolderResponse.builder()
        .id(saved.getId())
        .name(saved.getName())
        .parentFolderId(saved.getParentFolderId())
        .noteCount(0)
        .createdAt(saved.getCreatedAt())
        .updatedAt(saved.getUpdatedAt())
        .build();
  }

  @CacheEvict(value = "user-folders", key = "#userId")
  public FolderResponse rename(UUID userId, UUID id, RenameFolderRequest request) {
    NoteFolder folder = requireOwned(userId, id);

    boolean exists =
        folder.getParentFolderId() == null
            ? noteFolderRepository.existsByUserIdAndParentFolderIdIsNullAndName(
                userId, request.getName())
            : noteFolderRepository.existsByUserIdAndParentFolderIdAndName(
                userId, folder.getParentFolderId(), request.getName());

    if (exists && !folder.getName().equalsIgnoreCase(request.getName())) {
      throw new NoteConflictException("Folder already exists");
    }

    folder.setName(request.getName());
    NoteFolder saved = noteFolderRepository.saveAndFlush(folder);

    return FolderResponse.builder()
        .id(saved.getId())
        .name(saved.getName())
        .parentFolderId(saved.getParentFolderId())
        .createdAt(saved.getCreatedAt())
        .updatedAt(saved.getUpdatedAt())
        .build();
  }

  @CacheEvict(value = "user-folders", key = "#userId")
  public void delete(UUID userId, UUID id, boolean cascade) {
    NoteFolder folder = requireOwned(userId, id);

    List<NoteFolder> children = noteFolderRepository.findAllByParentFolderId(id);
    boolean hasNotes = noteFolderAssignmentRepository.existsByFolderId(id);

    if (!cascade && (!children.isEmpty() || hasNotes)) {
      throw new NoteConflictException(
          "Folder is not empty - pass cascade=true to delete it along with its contents");
    }

    // Children and note_folder_assignment rows cascade-delete at the DB
    // level (FK ON DELETE CASCADE) once the parent row goes.
    noteFolderRepository.delete(folder);
  }

  // Note ownership is verified by the caller (NoteService) before these run -
  // this service only owns folder-side invariants.
  public void assignNoteToFolder(UUID userId, UUID noteId, UUID folderId) {
    requireOwned(userId, folderId);

    if (noteFolderAssignmentRepository.findAllByNoteId(noteId).stream()
        .noneMatch(a -> a.getFolderId().equals(folderId))) {
      noteFolderAssignmentRepository.save(
          NoteFolderAssignment.builder().noteId(noteId).folderId(folderId).build());
    }
  }

  public void removeNoteFromFolder(UUID userId, UUID noteId, UUID folderId) {
    requireOwned(userId, folderId);
    noteFolderAssignmentRepository.deleteByNoteIdAndFolderId(noteId, folderId);
  }

  public List<UUID> getFolderIdsForNote(UUID noteId) {
    return noteFolderAssignmentRepository.findAllByNoteId(noteId).stream()
        .map(NoteFolderAssignment::getFolderId)
        .toList();
  }

  NoteFolder requireOwned(UUID userId, UUID id) {
    return noteFolderRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new NoteFolderNotFoundException(id));
  }

  List<UUID> collectDescendantIds(UUID folderId) {
    List<UUID> ids = new ArrayList<>();
    List<NoteFolder> children = noteFolderRepository.findAllByParentFolderId(folderId);

    for (NoteFolder child : children) {
      ids.add(child.getId());
      ids.addAll(collectDescendantIds(child.getId()));
    }

    return ids;
  }
}
