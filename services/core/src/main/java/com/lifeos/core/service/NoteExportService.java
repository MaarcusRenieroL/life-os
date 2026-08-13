package com.lifeos.core.service;

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
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoteExportService {

  private final NoteRepository noteRepository;
  private final NoteFolderAssignmentRepository noteFolderAssignmentRepository;

  public record ExportFile(String fileName, String contentType, byte[] content) {}

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
      return zipOf(notes, "md", this::toMarkdown);
    }

    if ("html".equalsIgnoreCase(format)) {
      return zipOf(notes, "html", this::toHtml);
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

  private ExportFile zipOf(List<Note> notes, String extension, java.util.function.Function<Note, String> render) {
    try (ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        ZipOutputStream zip = new ZipOutputStream(buffer)) {
      for (Note note : notes) {
        zip.putNextEntry(new ZipEntry(fileName(note, extension)));
        zip.write(render.apply(note).getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
      }
      zip.finish();

      return new ExportFile("notes-export.zip", "application/zip", buffer.toByteArray());
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
