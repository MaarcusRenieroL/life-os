package com.lifeos.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lifeos.core.domains.entity.Note;
import com.lifeos.core.exception.NoteNotFoundException;
import com.lifeos.core.exception.NoteValidationException;
import com.lifeos.core.repository.NoteFolderAssignmentRepository;
import com.lifeos.core.repository.NoteRepository;
import com.lifeos.core.util.NoteContentUtil;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoteExportService {

  private final NoteRepository noteRepository;
  private final NoteFolderAssignmentRepository noteFolderAssignmentRepository;
  private final ObjectMapper exportObjectMapper =
      new ObjectMapper().registerModule(new JavaTimeModule()).enable(SerializationFeature.INDENT_OUTPUT);

  public record ExportFile(String fileName, String contentType, byte[] content) {}

  // Settings page "Export all notes" - every non-deleted note the user
  // owns, as one archive/backup file. Deliberately excludes trashed notes:
  // exporting a backup of things you're about to lose to the 30-day purge
  // isn't what this button is for (use the trash page to restore instead).
  public ExportFile exportAll(UUID userId, String format) {
    List<Note> notes =
        noteRepository.findAllByUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(userId, Pageable.unpaged());

    return switch (format.toLowerCase()) {
      case "markdown", "zip" -> zipOf(notes, "md", this::toMarkdown, "notes-backup-markdown.zip");
      case "pdf" -> zipOfBytes(notes, "pdf", this::toPdf, "notes-backup-pdf.zip");
      case "json" -> toJsonBackup(notes);
      default -> throw new NoteValidationException("Unsupported export format: " + format);
    };
  }

  private ExportFile toJsonBackup(List<Note> notes) {
    try {
      List<Map<String, Object>> payload =
          notes.stream()
              .map(
                  (Note note) ->
                      Map.<String, Object>of(
                          "id", note.getId(),
                          "title", note.getTitle(),
                          "content", note.getContent() == null ? "" : note.getContent(),
                          "noteType", note.getNoteType(),
                          "isPinned", note.isPinned(),
                          "isFavorite", note.isFavorite(),
                          "isArchived", note.isArchived(),
                          "createdAt", note.getCreatedAt(),
                          "updatedAt", note.getUpdatedAt()))
              .toList();

      Map<String, Object> backup =
          Map.of("exportedAt", Instant.now(), "noteCount", notes.size(), "notes", payload);

      byte[] bytes = exportObjectMapper.writeValueAsBytes(backup);
      return new ExportFile("notes-backup.json", "application/json", bytes);
    } catch (Exception e) {
      throw new NoteValidationException("Failed to build JSON backup: " + e.getMessage());
    }
  }

  public ExportFile exportNote(UUID userId, UUID id, String format) {
    Note note =
        noteRepository
            .findByIdAndUserIdAndDeletedAtIsNull(id, userId)
            .orElseThrow(() -> new NoteNotFoundException(id));

    return switch (format.toLowerCase()) {
      case "markdown" -> new ExportFile(fileName(note, "md"), "text/markdown", toMarkdown(note).getBytes(StandardCharsets.UTF_8));
      case "html" -> new ExportFile(fileName(note, "html"), "text/html", toHtml(note).getBytes(StandardCharsets.UTF_8));
      case "pdf" -> new ExportFile(fileName(note, "pdf"), "application/pdf", toPdf(note));
      default -> throw new NoteValidationException("Unsupported export format: " + format);
    };
  }

  public ExportFile exportBulk(UUID userId, List<UUID> noteIds, UUID folderId, String format) {
    List<Note> notes = resolveNotes(userId, noteIds, folderId);

    if ("zip".equalsIgnoreCase(format) || "markdown".equalsIgnoreCase(format)) {
      return zipOf(notes, "md", this::toMarkdown, "notes-export.zip");
    }

    if ("html".equalsIgnoreCase(format)) {
      return zipOf(notes, "html", this::toHtml, "notes-export.zip");
    }

    throw new NoteValidationException("Unsupported bulk export format: " + format);
  }

  private List<Note> resolveNotes(UUID userId, List<UUID> noteIds, UUID folderId) {
    if (noteIds != null && !noteIds.isEmpty()) {
      return noteRepository.findAllById(noteIds).stream()
          .filter(n -> n.getUserId().equals(userId) && n.getDeletedAt() == null)
          .toList();
    }

    if (folderId != null) {
      List<UUID> ids =
          noteFolderAssignmentRepository.findAllByFolderId(folderId).stream()
              .map(a -> a.getNoteId())
              .toList();

      return noteRepository.findAllById(ids).stream()
          .filter(n -> n.getUserId().equals(userId) && n.getDeletedAt() == null)
          .toList();
    }

    throw new NoteValidationException("Either noteIds or folder must be provided");
  }

  private ExportFile zipOf(
      List<Note> notes, String extension, Function<Note, String> render, String archiveName) {
    return zipOfBytes(notes, extension, note -> render.apply(note).getBytes(StandardCharsets.UTF_8), archiveName);
  }

  private ExportFile zipOfBytes(
      List<Note> notes, String extension, Function<Note, byte[]> render, String archiveName) {
    try (ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        ZipOutputStream zip = new ZipOutputStream(buffer)) {
      for (Note note : notes) {
        zip.putNextEntry(new ZipEntry(fileName(note, extension)));
        zip.write(render.apply(note));
        zip.closeEntry();
      }
      zip.finish();

      return new ExportFile(archiveName, "application/zip", buffer.toByteArray());
    } catch (Exception e) {
      throw new NoteValidationException("Failed to build export archive: " + e.getMessage());
    }
  }

  private String toMarkdown(Note note) {
    StringBuilder sb = new StringBuilder();
    sb.append("# ").append(note.getTitle()).append("\n\n");
    sb.append(NoteContentUtil.toPlainText(note.getContent()));
    return sb.toString();
  }

  private String toHtml(Note note) {
    return "<!doctype html><html><head><meta charset=\"utf-8\"><title>"
        + escapeHtml(note.getTitle())
        + "</title></head><body><h1>"
        + escapeHtml(note.getTitle())
        + "</h1>"
        + (note.getContent() != null ? note.getContent() : "")
        + "</body></html>";
  }

  private byte[] toPdf(Note note) {
    try (ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
      Document document = new Document();
      PdfWriter.getInstance(document, buffer);
      document.open();
      document.add(new Paragraph(note.getTitle(), new Font(Font.HELVETICA, 20, Font.BOLD)));
      document.add(new Paragraph(" "));
      document.add(new Paragraph(NoteContentUtil.toPlainText(note.getContent()), new Font(Font.HELVETICA, 11)));
      document.close();

      return buffer.toByteArray();
    } catch (Exception e) {
      throw new NoteValidationException("Failed to generate PDF: " + e.getMessage());
    }
  }

  private String escapeHtml(String value) {
    return value == null
        ? ""
        : value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
  }

  private String fileName(Note note, String extension) {
    String slug = note.getTitle().replaceAll("[^a-zA-Z0-9-]+", "-").replaceAll("^-+|-+$", "");
    return (slug.isBlank() ? "note" : slug) + "." + extension;
  }
}
