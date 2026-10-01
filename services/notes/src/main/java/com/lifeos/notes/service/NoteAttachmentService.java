package com.lifeos.notes.service;

import com.lifeos.notes.domains.dto.response.AttachmentResponse;
import com.lifeos.notes.domains.dto.response.GlobalAttachmentResponse;
import com.lifeos.notes.domains.entity.NoteAttachment;
import com.lifeos.notes.domains.record.AttachmentWithNote;
import com.lifeos.notes.exception.AttachmentTooLargeException;
import com.lifeos.notes.exception.NoteAttachmentNotFoundException;
import com.lifeos.notes.exception.NoteConflictException;
import com.lifeos.notes.exception.NoteNotFoundException;
import com.lifeos.notes.exception.NoteValidationException;
import com.lifeos.notes.repository.NoteAttachmentRepository;
import com.lifeos.notes.repository.NoteRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
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

  /** The content type is decided here from the extension, never taken from the client, so a download is always a known type. */
  private static final Map<String, String> CONTENT_TYPES =
      Map.ofEntries(
          Map.entry("jpg", "image/jpeg"),
          Map.entry("jpeg", "image/jpeg"),
          Map.entry("png", "image/png"),
          Map.entry("gif", "image/gif"),
          Map.entry("webp", "image/webp"),
          Map.entry("pdf", "application/pdf"),
          Map.entry("doc", "application/msword"),
          Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
          Map.entry("txt", "text/plain"),
          Map.entry("md", "text/markdown"));

  private final NoteAttachmentRepository noteAttachmentRepository;
  private final NoteRepository noteRepository;

  @Value("${notes.attachments.storage-path:./data/note-attachments}")
  private String storagePath;

  // attachments is part of the note-detail payload.
  @CacheEvict(
      value = NoteService.NOTE_DETAIL_CACHE,
      key = NoteService.NOTE_DETAIL_KEY_BY_NOTE_ID)
  public AttachmentResponse upload(UUID userId, UUID noteId, MultipartFile file) {
    requireOwned(userId, noteId);

    if (file.getSize() > MAX_FILE_SIZE_BYTES) {
      throw new AttachmentTooLargeException(MAX_FILE_SIZE_BYTES);
    }

    if (noteAttachmentRepository.countByNoteIdAndDeletedAtIsNull(noteId) >= MAX_FILES_PER_NOTE) {
      throw new NoteConflictException("Maximum of " + MAX_FILES_PER_NOTE + " attachments per note");
    }

    String originalName = sanitiseFileName(file.getOriginalFilename());
    String extension = extensionOf(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.contains(extension)) {
      throw new NoteValidationException("File type not allowed: ." + extension);
    }

    try {
      Path dir = Paths.get(storagePath, userId.toString(), noteId.toString()).toAbsolutePath().normalize();
      Files.createDirectories(dir);

      // Stored under a generated name: nothing from the client ends up in the path.
      Path target = dir.resolve(UUID.randomUUID() + "." + extension).normalize();
      if (!target.startsWith(dir)) {
        throw new NoteValidationException("Invalid file name");
      }
      Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

      NoteAttachment attachment =
          NoteAttachment.builder()
              .noteId(noteId)
              .fileName(originalName)
              .fileKey(target.toString())
              .fileSize(file.getSize())
              .fileType(CONTENT_TYPES.get(extension))
              .build();

      return toResponse(noteAttachmentRepository.saveAndFlush(attachment));
    } catch (IOException e) {
      throw new NoteValidationException("Failed to store attachment: " + e.getMessage());
    }
  }

  @Transactional(readOnly = true)
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
  @Transactional(readOnly = true)
  public List<GlobalAttachmentResponse> listAllForUser(UUID userId) {
    return noteAttachmentRepository.findAllForUser(userId).stream().map(this::toGlobalResponse).toList();
  }

  @Transactional(readOnly = true)
  public NoteAttachment get(UUID userId, UUID noteId, UUID attachmentId) {
    requireOwned(userId, noteId);
    return noteAttachmentRepository
        .findByIdAndNoteIdAndDeletedAtIsNull(attachmentId, noteId)
        .orElseThrow(() -> new NoteAttachmentNotFoundException(attachmentId));
  }

  @Transactional(readOnly = true)
  public InputStream download(UUID userId, UUID noteId, UUID attachmentId) {
    NoteAttachment attachment = get(userId, noteId, attachmentId);

    try {
      return Files.newInputStream(Path.of(attachment.getFileKey()));
    } catch (IOException e) {
      throw new NoteValidationException("Failed to read attachment: " + e.getMessage());
    }
  }

  @CacheEvict(
      value = NoteService.NOTE_DETAIL_CACHE,
      key = NoteService.NOTE_DETAIL_KEY_BY_NOTE_ID)
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

  /** The display name only: last path segment, no control characters, at most 200 characters. */
  static String sanitiseFileName(String raw) {
    if (raw == null) {
      return "file";
    }
    String name = raw.replace('\\', '/');
    name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
    if (name.isEmpty() || name.equals(".") || name.equals("..")) {
      return "file";
    }
    if (name.length() > 200) {
      String ext = extensionOf(name);
      name = name.substring(0, Math.max(1, 200 - ext.length() - 1)) + (ext.isEmpty() ? "" : "." + ext);
    }
    return name;
  }

  private static String extensionOf(String fileName) {
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
