package com.lifeos.core.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.core.domains.dto.request.AddNoteLinkRequest;
import com.lifeos.core.domains.dto.request.AddTagRequest;
import com.lifeos.core.domains.dto.request.AssignFolderRequest;
import com.lifeos.core.domains.dto.request.CreateNoteModuleLinkRequest;
import com.lifeos.core.domains.dto.request.CreateNoteRequest;
import com.lifeos.core.domains.dto.request.DuplicateNoteRequest;
import com.lifeos.core.domains.dto.request.UpdateNoteRequest;
import com.lifeos.core.domains.dto.response.AttachmentResponse;
import com.lifeos.core.domains.dto.response.NoteLinkResponse;
import com.lifeos.core.domains.dto.response.NoteModuleLinkResponse;
import com.lifeos.core.domains.dto.response.NoteResponse;
import com.lifeos.core.domains.dto.response.NoteSummaryResponse;
import com.lifeos.core.domains.dto.response.NoteVersionResponse;
import com.lifeos.core.domains.dto.response.TagResponse;
import com.lifeos.core.domains.entity.NoteAttachment;
import com.lifeos.core.domains.enums.NoteModuleType;
import com.lifeos.core.domains.enums.NoteType;
import com.lifeos.core.domains.record.PageResponse;
import com.lifeos.core.service.NoteAttachmentService;
import com.lifeos.core.service.NoteExportService;
import com.lifeos.core.service.NoteFolderService;
import com.lifeos.core.service.NoteLinkService;
import com.lifeos.core.service.NoteModuleLinkService;
import com.lifeos.core.service.NoteService;
import com.lifeos.core.service.TagService;
import jakarta.validation.Valid;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/notes")
@RequiredArgsConstructor
public class NoteController {

  private final NoteService noteService;
  private final NoteFolderService noteFolderService;
  private final TagService tagService;
  private final NoteLinkService noteLinkService;
  private final NoteModuleLinkService noteModuleLinkService;
  private final NoteAttachmentService noteAttachmentService;
  private final NoteExportService noteExportService;

  @GetMapping
  public ResponseEntity<ApiResponse<PageResponse<NoteSummaryResponse>>> list(
      Authentication authentication,
      @RequestParam(defaultValue = "modified") String sort,
      @RequestParam(defaultValue = "desc") String order,
      @RequestParam(required = false) UUID folder,
      @RequestParam(required = false) UUID tag,
      @RequestParam(required = false) NoteType noteType,
      @RequestParam(defaultValue = "false") boolean archived,
      @RequestParam(required = false) Boolean favorite,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    UUID userId = userId(authentication);

    return ResponseEntity.ok(
        ApiResponse.success(
            PageResponse.from(
                noteService.list(
                    userId, sort, order, folder, tag, noteType, archived, favorite, page, size)),
            "Notes fetched successfully"));
  }

  @GetMapping("/recent")
  public ResponseEntity<ApiResponse<List<NoteSummaryResponse>>> recent(
      Authentication authentication, @RequestParam(defaultValue = "10") int limit) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteService.recent(userId(authentication), limit), "Recent notes fetched successfully"));
  }

  @GetMapping("/favorites")
  public ResponseEntity<ApiResponse<List<NoteSummaryResponse>>> favorites(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.favorites(userId(authentication)), "Favorite notes fetched successfully"));
  }

  @GetMapping("/pinned")
  public ResponseEntity<ApiResponse<List<NoteSummaryResponse>>> pinned(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.pinned(userId(authentication)), "Pinned notes fetched successfully"));
  }

  @GetMapping("/by-module/{moduleType}/{moduleId}")
  public ResponseEntity<ApiResponse<List<NoteSummaryResponse>>> byModule(
      Authentication authentication, @PathVariable NoteModuleType moduleType, @PathVariable UUID moduleId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteService.byModule(userId(authentication), moduleType, moduleId),
            "Notes for module fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<NoteResponse>> get(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.get(userId(authentication), id), "Note fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<NoteResponse>> create(
      Authentication authentication, @Valid @RequestBody CreateNoteRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.create(userId(authentication), request), "Note created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<NoteResponse>> update(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody UpdateNoteRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.update(userId(authentication), id, request), "Note updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> delete(Authentication authentication, @PathVariable UUID id) {
    noteService.softDelete(userId(authentication), id);
    return ResponseEntity.ok(ApiResponse.success(null, "Note deleted successfully"));
  }

  @PostMapping("/{id}/restore")
  public ResponseEntity<ApiResponse<NoteResponse>> restore(Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.restore(userId(authentication), id), "Note restored successfully"));
  }

  @PostMapping("/{id}/duplicate")
  public ResponseEntity<ApiResponse<NoteResponse>> duplicate(
      Authentication authentication, @PathVariable UUID id, @RequestBody(required = false) DuplicateNoteRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteService.duplicate(
                userId(authentication), id, request != null ? request : new DuplicateNoteRequest()),
            "Note duplicated successfully"));
  }

  @GetMapping("/{id}/versions")
  public ResponseEntity<ApiResponse<List<NoteVersionResponse>>> versions(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.getVersions(userId(authentication), id), "Versions fetched successfully"));
  }

  @PostMapping("/{id}/versions/{versionNumber}/restore")
  public ResponseEntity<ApiResponse<NoteResponse>> restoreVersion(
      Authentication authentication, @PathVariable UUID id, @PathVariable int versionNumber) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteService.restoreVersion(userId(authentication), id, versionNumber),
            "Version restored successfully"));
  }

  @GetMapping("/{id}/backlinks")
  public ResponseEntity<ApiResponse<List<NoteLinkResponse>>> backlinks(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.get(userId(authentication), id).getBacklinks(), "Backlinks fetched successfully"));
  }

  @GetMapping("/{id}/outgoing-links")
  public ResponseEntity<ApiResponse<List<NoteLinkResponse>>> outgoingLinks(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteService.get(userId(authentication), id).getOutgoingLinks(), "Outgoing links fetched successfully"));
  }

  @PostMapping("/{id}/links")
  public ResponseEntity<ApiResponse<Void>> addLink(
      Authentication authentication, @PathVariable UUID id, @Valid @RequestBody AddNoteLinkRequest request) {
    noteLinkService.addLink(userId(authentication), id, request.getTargetNoteId());
    return ResponseEntity.ok(ApiResponse.success(null, "Link added successfully"));
  }

  @DeleteMapping("/{sourceId}/links/{targetId}")
  public ResponseEntity<ApiResponse<Void>> removeLink(
      Authentication authentication, @PathVariable UUID sourceId, @PathVariable UUID targetId) {
    noteLinkService.removeLink(userId(authentication), sourceId, targetId);
    return ResponseEntity.ok(ApiResponse.success(null, "Link removed successfully"));
  }

  @PostMapping("/{noteId}/tags")
  public ResponseEntity<ApiResponse<NoteResponse>> addTag(
      Authentication authentication, @PathVariable UUID noteId, @Valid @RequestBody AddTagRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteService.addTag(userId(authentication), noteId, request.getTagId()), "Tag added successfully"));
  }

  @DeleteMapping("/{noteId}/tags/{tagId}")
  public ResponseEntity<ApiResponse<NoteResponse>> removeTag(
      Authentication authentication, @PathVariable UUID noteId, @PathVariable UUID tagId) {
    return ResponseEntity.ok(
        ApiResponse.success(noteService.removeTag(userId(authentication), noteId, tagId), "Tag removed successfully"));
  }

  @PostMapping("/{noteId}/folders")
  public ResponseEntity<ApiResponse<Void>> assignFolder(
      Authentication authentication, @PathVariable UUID noteId, @Valid @RequestBody AssignFolderRequest request) {
    UUID userId = userId(authentication);
    noteService.get(userId, noteId);
    noteFolderService.assignNoteToFolder(userId, noteId, request.getFolderId());

    return ResponseEntity.ok(ApiResponse.success(null, "Note assigned to folder successfully"));
  }

  @DeleteMapping("/{noteId}/folders/{folderId}")
  public ResponseEntity<ApiResponse<Void>> removeFolder(
      Authentication authentication, @PathVariable UUID noteId, @PathVariable UUID folderId) {
    UUID userId = userId(authentication);
    noteService.get(userId, noteId);
    noteFolderService.removeNoteFromFolder(userId, noteId, folderId);

    return ResponseEntity.ok(ApiResponse.success(null, "Note removed from folder successfully"));
  }

  @PostMapping("/{noteId}/module-links")
  public ResponseEntity<ApiResponse<NoteModuleLinkResponse>> addModuleLink(
      Authentication authentication, @PathVariable UUID noteId, @Valid @RequestBody CreateNoteModuleLinkRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteModuleLinkService.addLink(userId(authentication), noteId, request.getModuleType(), request.getModuleId()),
            "Module link added successfully"));
  }

  @DeleteMapping("/{noteId}/module-links/{linkId}")
  public ResponseEntity<ApiResponse<Void>> removeModuleLink(
      Authentication authentication, @PathVariable UUID noteId, @PathVariable UUID linkId) {
    noteModuleLinkService.removeLink(userId(authentication), noteId, linkId);
    return ResponseEntity.ok(ApiResponse.success(null, "Module link removed successfully"));
  }

  @PostMapping(value = "/{noteId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ApiResponse<AttachmentResponse>> uploadAttachment(
      Authentication authentication, @PathVariable UUID noteId, @RequestPart("file") MultipartFile file) {
    return ResponseEntity.ok(
        ApiResponse.success(
            noteAttachmentService.upload(userId(authentication), noteId, file), "Attachment uploaded successfully"));
  }

  @GetMapping("/{noteId}/attachments/{attachmentId}/download")
  public ResponseEntity<InputStreamResource> downloadAttachment(
      Authentication authentication, @PathVariable UUID noteId, @PathVariable UUID attachmentId) {
    UUID userId = userId(authentication);
    NoteAttachment attachment = noteAttachmentService.get(userId, noteId, attachmentId);
    InputStream stream = noteAttachmentService.download(userId, noteId, attachmentId);

    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(attachment.getFileName()).build().toString())
        .contentType(
            attachment.getFileType() != null
                ? MediaType.parseMediaType(attachment.getFileType())
                : MediaType.APPLICATION_OCTET_STREAM)
        .body(new InputStreamResource(stream));
  }

  @DeleteMapping("/{noteId}/attachments/{attachmentId}")
  public ResponseEntity<ApiResponse<Void>> deleteAttachment(
      Authentication authentication, @PathVariable UUID noteId, @PathVariable UUID attachmentId) {
    noteAttachmentService.delete(userId(authentication), noteId, attachmentId);
    return ResponseEntity.ok(ApiResponse.success(null, "Attachment deleted successfully"));
  }

  @GetMapping("/{id}/export")
  public ResponseEntity<byte[]> exportNote(
      Authentication authentication, @PathVariable UUID id, @RequestParam(defaultValue = "markdown") String format) {
    NoteExportService.ExportFile file = noteExportService.exportNote(userId(authentication), id, format);

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.fileName()).build().toString())
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.content());
  }

  @PostMapping("/export-bulk")
  public ResponseEntity<byte[]> exportBulk(
      Authentication authentication, @RequestBody BulkExportRequest request) {
    NoteExportService.ExportFile file =
        noteExportService.exportBulk(
            userId(authentication), request.noteIds(), request.folder(), request.format());

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.fileName()).build().toString())
        .contentType(MediaType.parseMediaType(file.contentType()))
        .body(file.content());
  }

  public record BulkExportRequest(List<UUID> noteIds, UUID folder, String format) {}

  private UUID userId(Authentication authentication) {
    return (UUID) authentication.getPrincipal();
  }
}
