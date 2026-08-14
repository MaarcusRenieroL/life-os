package com.lifeos.core.service;

import com.lifeos.core.domains.dto.response.AttachmentResponse;
import com.lifeos.core.domains.dto.response.GlobalAttachmentResponse;
import com.lifeos.core.domains.entity.NoteAttachment;
import com.lifeos.core.domains.record.AttachmentWithNote;
import com.lifeos.core.exception.AttachmentTooLargeException;
import com.lifeos.core.exception.NoteAttachmentNotFoundException;
import com.lifeos.core.exception.NoteConflictException;
import com.lifeos.core.exception.NoteNotFoundException;
import com.lifeos.core.exception.NoteValidationException;
import com.lifeos.core.repository.NoteAttachmentRepository;
import com.lifeos.core.repository.NoteRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteAttachmentService {

  private static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024;
  private static final int MAX_FILES_PER_NOTE = 10;
  private static final Set<String> ALLOWED_EXTENSIONS =
      Set.of("jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "txt", "md");

  private final NoteAttachmentRepository noteAttachmentRepository;
  private final NoteRepository noteRepository;

  @Value("${notes.attachments.storage-path:./data/note-attachments}")
  private String storagePath;

  public AttachmentResponse upload(UUID userId, UUID noteId, MultipartFile file) {
    requireOwned(userId, noteId);

    if (file.getSize() > MAX_FILE_SIZE_BYTES) {
      throw new AttachmentTooLargeException(MAX_FILE_SIZE_BYTES);
    }

    if (noteAttachmentRepository.countByNoteIdAndDeletedAtIsNull(noteId) >= MAX_FILES_PER_NOTE) {
      throw new NoteConflictException("Maximum of " + MAX_FILES_PER_NOTE + " attachments per note");
    }

    String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
    String extension = extensionOf(originalName);

    if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
      throw new NoteValidationException("File type not allowed: ." + extension);
    }

    try {
      Path dir = Paths.get(storagePath, userId.toString(), noteId.toString());
      Files.createDirectories(dir);

      String storedName = UUID.randomUUID() + "-" + originalName;
      Path target = dir.resolve(storedName);
      Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

      NoteAttachment attachment =
          NoteAttachment.builder()
              .noteId(noteId)
              .fileName(originalName)
              .fileKey(target.toString())
              .fileSize(file.getSize())
              .fileType(file.getContentType())
              .build();

      return toResponse(noteAttachmentRepository.saveAndFlush(attachment));
    } catch (IOException e) {
      throw new NoteValidationException("Failed to store attachment: " + e.getMessage());
    }
  }

  public List<AttachmentResponse> listForNote(UUID userId, UUID noteId) {
    requireOwned(userId, noteId);
    return noteAttachmentRepository.findAllByNoteIdAndDeletedAtIsNull(noteId).stream()
        .map(this::toResponse)
        .toList();
  }

  // Cross-note view for the Attachments page - deliberately unpaginated and
  // unfiltered server-side. This is a personal note-taking tool, not a file
  // host; the expected attachment count per user is small enough that the
  // frontend can search/filter the full list client-side without a second
  // query round trip per keystroke.
  public List<GlobalAttachmentResponse> listAllForUser(UUID userId) {
    return noteAttachmentRepository.findAllForUser(userId).stream().map(this::toGlobalResponse).toList();
  }

  public NoteAttachment get(UUID userId, UUID noteId, UUID attachmentId) {
    requireOwned(userId, noteId);
    return noteAttachmentRepository
        .findByIdAndNoteIdAndDeletedAtIsNull(attachmentId, noteId)
        .orElseThrow(() -> new NoteAttachmentNotFoundException(attachmentId));
  }

  public InputStream download(UUID userId, UUID noteId, UUID attachmentId) {
    NoteAttachment attachment = get(userId, noteId, attachmentId);

    try {
      return Files.newInputStream(Path.of(attachment.getFileKey()));
    } catch (IOException e) {
      throw new NoteValidationException("Failed to read attachment: " + e.getMessage());
    }
  }

  public void delete(UUID userId, UUID noteId, UUID attachmentId) {
    NoteAttachment attachment = get(userId, noteId, attachmentId);
    attachment.setDeletedAt(Instant.now());
    noteAttachmentRepository.save(attachment);
  }

  private void requireOwned(UUID userId, UUID noteId) {
    noteRepository
        .findByIdAndUserIdAndDeletedAtIsNull(noteId, userId)
        .orElseThrow(() -> new NoteNotFoundException(noteId));
  }

  private String extensionOf(String fileName) {
    int dot = fileName.lastIndexOf('.');
    return dot >= 0 ? fileName.substring(dot + 1) : "";
  }

  private AttachmentResponse toResponse(NoteAttachment attachment) {
    return AttachmentResponse.builder()
        .id(attachment.getId())
        .fileName(attachment.getFileName())
        .fileSize(attachment.getFileSize())
        .fileType(attachment.getFileType())
        .uploadDate(attachment.getUploadDate())
        .build();
  }

  private GlobalAttachmentResponse toGlobalResponse(AttachmentWithNote row) {
    return GlobalAttachmentResponse.builder()
        .id(row.id())
        .fileName(row.fileName())
        .fileSize(row.fileSize())
        .fileType(row.fileType())
        .uploadDate(row.uploadDate())
        .noteId(row.noteId())
        .noteTitle(row.noteTitle())
        .build();
  }
}
