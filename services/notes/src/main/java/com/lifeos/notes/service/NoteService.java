package com.lifeos.notes.service;

import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.notes.domains.dto.request.CreateNoteModuleLinkRequest;
import com.lifeos.notes.domains.dto.request.CreateNoteRequest;
import com.lifeos.notes.domains.dto.request.DuplicateNoteRequest;
import com.lifeos.notes.domains.dto.request.UpdateNoteRequest;
import com.lifeos.notes.domains.dto.response.NoteLinkResponse;
import com.lifeos.notes.domains.dto.response.NoteModuleLinkResponse;
import com.lifeos.notes.domains.dto.response.NoteResponse;
import com.lifeos.notes.domains.dto.response.NoteSummaryResponse;
import com.lifeos.notes.domains.dto.response.NoteVersionResponse;
import com.lifeos.notes.domains.dto.response.TagResponse;
import com.lifeos.notes.domains.dto.response.TrashedNoteResponse;
import com.lifeos.notes.domains.entity.Note;
import com.lifeos.notes.domains.entity.NoteLink;
import com.lifeos.notes.domains.entity.NoteModuleLink;
import com.lifeos.notes.domains.entity.NoteTag;
import com.lifeos.notes.domains.entity.NoteVersion;
import com.lifeos.notes.domains.entity.Tag;
import com.lifeos.notes.domains.enums.NoteModuleType;
import com.lifeos.notes.domains.enums.NoteType;
import com.lifeos.notes.exception.NoteNotFoundException;
import com.lifeos.notes.exception.NoteValidationException;
import com.lifeos.notes.repository.NoteAttachmentRepository;
import com.lifeos.notes.repository.NoteLinkRepository;
import com.lifeos.notes.repository.NoteModuleLinkRepository;
import com.lifeos.notes.repository.NoteRepository;
import com.lifeos.notes.repository.NoteTagRepository;
import com.lifeos.notes.repository.NoteVersionRepository;
import com.lifeos.notes.repository.TagRepository;
import com.lifeos.notes.util.NoteContentUtil;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteService {

  // The "note-detail" cache (10 min TTL, registered in CacheConfig) backs
  // NoteService#get. Keyed on user + note so one user's cached detail can
  // never be served to another, even though note ids are globally unique.
  // These are package-private because the sibling services that mutate parts
  // of the detail payload (links, folders, module links, attachments) evict
  // the same key and must use the identical name/key expression.
  static final String NOTE_DETAIL_CACHE = "note-detail";
  static final String NOTE_DETAIL_KEY = "#userId + ':' + #id";
  static final String NOTE_DETAIL_KEY_BY_NOTE_ID = "#userId + ':' + #noteId";

  private static final Map<String, String> SORT_FIELDS =
      Map.of("title", "title", "created", "createdAt", "modified", "updatedAt", "manual", "updatedAt");

  private final NoteRepository noteRepository;
  private final NoteTagRepository noteTagRepository;
  private final TagRepository tagRepository;
  private final NoteLinkRepository noteLinkRepository;
  private final NoteModuleLinkRepository noteModuleLinkRepository;
  private final NoteAttachmentRepository noteAttachmentRepository;
  private final NoteVersionRepository noteVersionRepository;
  private final NoteFolderService noteFolderService;
  private final TagService tagService;

  @Transactional(readOnly = true)
  public org.springframework.data.domain.Page<NoteSummaryResponse> list(
      UUID userId,
      String sort,
      String order,
      UUID folderId,
      UUID tagId,
      NoteType noteType,
      boolean archived,
      Boolean favorite,
      Boolean pinned,
      int page,
      int size) {
    Specification<Note> spec =
        Specification.allOf(NoteSpecifications.userId(userId), NoteSpecifications.notDeleted())
            .and(NoteSpecifications.archived(archived));

    if (folderId != null) {
      spec = spec.and(NoteSpecifications.inFolder(folderId));
    }

    if (tagId != null) {
      spec = spec.and(NoteSpecifications.hasTag(tagId));
    }

    if (noteType != null) {
      spec = spec.and(NoteSpecifications.noteType(noteType));
    }

    if (favorite != null) {
      spec = spec.and(NoteSpecifications.favorite(favorite));
    }

    if (pinned != null) {
      spec = spec.and(NoteSpecifications.pinned(pinned));
    }

    String sortField = SORT_FIELDS.getOrDefault(sort, "updatedAt");
    Sort.Direction direction = "asc".equalsIgnoreCase(order) ? Sort.Direction.ASC : Sort.Direction.DESC;
    Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

    return noteRepository.findAll(spec, pageable).map(this::toSummary);
  }

  @Cacheable(value = NOTE_DETAIL_CACHE, key = NOTE_DETAIL_KEY)
  @Transactional(readOnly = true)
  public NoteResponse get(UUID userId, UUID id) {
    return toFull(requireOwned(userId, id));
  }

  public NoteResponse create(UUID userId, CreateNoteRequest request) {
    String plainText = NoteContentUtil.toPlainText(request.getContent());

    Note note =
        Note.builder()
            .userId(userId)
            .title(request.getTitle())
            .content(request.getContent())
            .contentPlainText(plainText)
            // CreateNoteRequest has no description field of its own (per
            // spec, that's an update-only override) - derive the list-view
            // preview from the content itself so a fresh note doesn't show
            // a blank "No content yet" card the moment it has real text.
            .description(NoteContentUtil.excerpt(plainText, 200))
            .noteType(request.getNoteType() != null ? request.getNoteType() : NoteType.GENERAL)
            .isPinned(false)
            .isArchived(false)
            .isFavorite(false)
            .contentVersion(1)
            .build();

    Note saved = noteRepository.saveAndFlush(note);

    if (request.getFolderId() != null) {
      noteFolderService.assignNoteToFolder(userId, saved.getId(), request.getFolderId());
    }

    if (request.getTags() != null) {
      for (String tagName : request.getTags()) {
        if (StringUtils.hasText(tagName)) {
          addTagInternal(saved.getId(), tagService.getOrCreateEntity(userId, tagName).getId());
        }
      }
    }

    if (request.getModuleLinks() != null) {
      for (CreateNoteModuleLinkRequest link : request.getModuleLinks()) {
        noteModuleLinkRepository.save(
            NoteModuleLink.builder()
                .noteId(saved.getId())
                .moduleType(link.getModuleType())
                .moduleId(link.getModuleId())
                .build());
      }
    }

    return toFull(saved);
  }

  // Used by NoteTemplateService for POST /templates/{id}/use - bypasses
  // CreateNoteRequest since a template only ever supplies title + content,
  // no tags/folder/module-links to wire up.
  public NoteResponse createFromTemplate(UUID userId, String title, String content) {
    String plainText = NoteContentUtil.toPlainText(content);

    Note note =
        Note.builder()
            .userId(userId)
            .title(title)
            .content(content)
            .contentPlainText(plainText)
            .description(NoteContentUtil.excerpt(plainText, 200))
            .noteType(NoteType.GENERAL)
            .isPinned(false)
            .isArchived(false)
            .isFavorite(false)
            .contentVersion(1)
            .build();

    return toFull(noteRepository.saveAndFlush(note));
  }

  // Covers content edits (which also append a version), pin/favorite toggles
  // and archive/unarchive - each changes the cached detail payload.
  @CacheEvict(value = NOTE_DETAIL_CACHE, key = NOTE_DETAIL_KEY)
  public NoteResponse update(UUID userId, UUID id, UpdateNoteRequest request) {
    Note note = requireOwned(userId, id);

    if (StringUtils.hasText(request.getTitle())) {
      note.setTitle(request.getTitle());
    }

    if (request.getContent() != null && !request.getContent().equals(note.getContent())) {
      // Snapshot what's *about to become* history before overwriting, so
      // note_versions holds every version except the current live one.
      noteVersionRepository.save(
          NoteVersion.builder()
              .noteId(note.getId())
              .versionNumber(note.getContentVersion())
              .content(note.getContent())
              .contentPlainText(note.getContentPlainText())
              .createdBy(userId)
              .build());

      note.setContent(request.getContent());
      note.setContentPlainText(NoteContentUtil.toPlainText(request.getContent()));
      note.setContentVersion(note.getContentVersion() + 1);

      // Keep the list-view preview in sync with the new content unless this
      // same request also sent an explicit description - that's a
      // deliberate user override and shouldn't be clobbered by auto-derive.
      if (request.getDescription() == null) {
        note.setDescription(NoteContentUtil.excerpt(note.getContentPlainText(), 200));
      }
    }

    if (request.getDescription() != null) {
      note.setDescription(request.getDescription());
    }

    if (request.getNoteType() != null) {
      note.setNoteType(request.getNoteType());
    }

    if (request.getIsPinned() != null) {
      note.setPinned(request.getIsPinned());
    }

    if (request.getIsArchived() != null) {
      note.setArchived(request.getIsArchived());
    }

    if (request.getIsFavorite() != null) {
      note.setFavorite(request.getIsFavorite());
    }

    if (Boolean.TRUE.equals(request.getClearFollowUpAt())) {
      note.setFollowUpAt(null);
    } else if (request.getFollowUpAt() != null) {
      note.setFollowUpAt(request.getFollowUpAt());
    }

    return toFull(noteRepository.saveAndFlush(note));
  }

  @CacheEvict(value = NOTE_DETAIL_CACHE, key = NOTE_DETAIL_KEY_BY_NOTE_ID)
  public NoteResponse addTag(UUID userId, UUID noteId, UUID tagId) {
    Note note = requireOwned(userId, noteId);
    tagService.requireOwned(userId, tagId);
    addTagInternal(note.getId(), tagId);
    return toFull(note);
  }

  @CacheEvict(value = NOTE_DETAIL_CACHE, key = NOTE_DETAIL_KEY_BY_NOTE_ID)
  public NoteResponse removeTag(UUID userId, UUID noteId, UUID tagId) {
    Note note = requireOwned(userId, noteId);
    noteTagRepository.deleteByNoteIdAndTagId(noteId, tagId);
    return toFull(note);
  }

  @CacheEvict(value = NOTE_DETAIL_CACHE, key = NOTE_DETAIL_KEY)
  public void softDelete(UUID userId, UUID id) {
    Note note = requireOwned(userId, id);
    note.setDeletedAt(Instant.now());
    noteRepository.save(note);
  }

  @CacheEvict(value = NOTE_DETAIL_CACHE, key = NOTE_DETAIL_KEY)
  public NoteResponse restore(UUID userId, UUID id) {
    Note note = noteRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new NoteNotFoundException(id));
    note.setDeletedAt(null);
    note.setArchived(false);
    return toFull(noteRepository.saveAndFlush(note));
  }

  private static final int TRASH_RETENTION_DAYS = 30;

  @Transactional(readOnly = true)
  public List<TrashedNoteResponse> listTrash(UUID userId) {
    return noteRepository.findAllByUserIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(userId).stream()
        .map(
            note ->
                TrashedNoteResponse.builder()
                    .id(note.getId())
                    .title(note.getTitle())
                    .deletedAt(note.getDeletedAt())
                    .purgesAt(note.getDeletedAt().plus(TRASH_RETENTION_DAYS, java.time.temporal.ChronoUnit.DAYS))
                    .build())
        .toList();
  }

  @CacheEvict(value = NOTE_DETAIL_CACHE, key = NOTE_DETAIL_KEY)
  public void permanentlyDelete(UUID userId, UUID id) {
    Note note =
        noteRepository
            .findByIdAndUserIdAndDeletedAtIsNotNull(id, userId)
            .orElseThrow(() -> new NoteNotFoundException(id));

    // Every child table (note_tags, note_folder_assignment, note_links,
    // note_module_links, note_attachments, note_versions) has ON DELETE
    // CASCADE back to notes(id), so a single delete here is enough - no
    // orphaned rows left behind. Attachment files on disk are intentionally
    // left as-is (matches the rest of the module - attachment blobs are
    // never actively cleaned up on any deletion path today).
    noteRepository.delete(note);
  }

  public NoteResponse duplicate(UUID userId, UUID id, DuplicateNoteRequest request) {
    Note source = requireOwned(userId, id);

    Note copy =
        Note.builder()
            .userId(userId)
            .title(
                StringUtils.hasText(request.getNewTitle())
                    ? request.getNewTitle()
                    : source.getTitle() + " (Copy)")
            .content(source.getContent())
            .contentPlainText(source.getContentPlainText())
            .description(source.getDescription())
            .noteType(source.getNoteType())
            .contentVersion(1)
            .build();

    Note saved = noteRepository.saveAndFlush(copy);

    for (NoteTag noteTag : noteTagRepository.findAllByNoteId(source.getId())) {
      addTagInternal(saved.getId(), noteTag.getTagId());
    }

    for (UUID folderId : noteFolderService.getFolderIdsForNote(source.getId())) {
      noteFolderService.assignNoteToFolder(userId, saved.getId(), folderId);
    }

    return toFull(saved);
  }

  @Transactional(readOnly = true)
  public List<NoteSummaryResponse> recent(UUID userId, int limit) {
    return noteRepository
        .findAllByUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(userId, PageRequest.of(0, limit))
        .stream()
        .map(this::toSummary)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<NoteSummaryResponse> favorites(UUID userId) {
    return noteRepository.findAllByUserIdAndIsFavoriteTrueAndDeletedAtIsNullAndIsArchivedFalse(userId)
        .stream()
        .map(this::toSummary)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<NoteSummaryResponse> pinned(UUID userId) {
    return noteRepository.findAllByUserIdAndIsPinnedTrueAndDeletedAtIsNullAndIsArchivedFalse(userId)
        .stream()
        .map(this::toSummary)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<NoteSummaryResponse> byModule(UUID userId, NoteModuleType moduleType, UUID moduleId) {
    List<UUID> noteIds =
        noteModuleLinkRepository.findAllByModuleTypeAndModuleId(moduleType, moduleId).stream()
            .map(NoteModuleLink::getNoteId)
            .toList();

    if (noteIds.isEmpty()) {
      return List.of();
    }

    return noteRepository.findAllById(noteIds).stream()
        .filter(n -> n.getUserId().equals(userId) && n.getDeletedAt() == null)
        .map(this::toSummary)
        .toList();
  }

  // Internal Today endpoint (called by core's cross-module aggregator, see
  // InternalTodayController) - notes whose follow-up is due today or overdue. "Overdue" priority
  // is "urgent" (it already slipped), "due today" is "warning" (still actionable today).
  @Transactional(readOnly = true)
  public List<TodayItemResponse> todayFollowUps(UUID userId) {
    Instant endOfToday =
        java.time.LocalDate.now(java.time.ZoneId.systemDefault())
            .plusDays(1)
            .atStartOfDay(java.time.ZoneId.systemDefault())
            .toInstant();

    return noteRepository
        .findAllByUserIdAndFollowUpAtIsNotNullAndFollowUpAtLessThanAndDeletedAtIsNull(
            userId, endOfToday)
        .stream()
        .map(
            note ->
                TodayItemResponse.builder()
                    .module("notes")
                    .type("note_followup")
                    .title(note.getTitle())
                    .description(note.getDescription())
                    .dueAt(note.getFollowUpAt())
                    .entityId(note.getId().toString())
                    .priority(note.getFollowUpAt().isBefore(Instant.now()) ? "urgent" : "warning")
                    .build())
        .toList();
  }

  @Transactional(readOnly = true)
  public List<NoteVersionResponse> getVersions(UUID userId, UUID id) {
    requireOwned(userId, id);

    return noteVersionRepository.findAllByNoteIdOrderByVersionNumberDesc(id).stream()
        .map(
            v ->
                NoteVersionResponse.builder()
                    .id(v.getId())
                    .versionNumber(v.getVersionNumber())
                    .createdAt(v.getCreatedAt())
                    .createdBy(v.getCreatedBy())
                    .build())
        .toList();
  }

  // Rolls content back and appends a new version, so both the content and the
  // inline version list in the cached detail go stale.
  @CacheEvict(value = NOTE_DETAIL_CACHE, key = NOTE_DETAIL_KEY)
  public NoteResponse restoreVersion(UUID userId, UUID id, int versionNumber) {
    Note note = requireOwned(userId, id);
    NoteVersion version =
        noteVersionRepository
            .findByNoteIdAndVersionNumber(id, versionNumber)
            .orElseThrow(
                () -> new NoteValidationException("Version " + versionNumber + " does not exist"));

    noteVersionRepository.save(
        NoteVersion.builder()
            .noteId(note.getId())
            .versionNumber(note.getContentVersion())
            .content(note.getContent())
            .contentPlainText(note.getContentPlainText())
            .createdBy(userId)
            .build());

    note.setContent(version.getContent());
    note.setContentPlainText(version.getContentPlainText());
    note.setContentVersion(note.getContentVersion() + 1);

    return toFull(noteRepository.saveAndFlush(note));
  }

  Note requireOwned(UUID userId, UUID id) {
    return noteRepository
        .findByIdAndUserIdAndDeletedAtIsNull(id, userId)
        .orElseThrow(() -> new NoteNotFoundException(id));
  }

  private void addTagInternal(UUID noteId, UUID tagId) {
    if (!noteTagRepository.existsByNoteIdAndTagId(noteId, tagId)) {
      noteTagRepository.save(NoteTag.builder().noteId(noteId).tagId(tagId).build());
    }
  }

  private NoteSummaryResponse toSummary(Note note) {
    return NoteSummaryResponse.builder()
        .id(note.getId())
        .title(note.getTitle())
        .description(note.getDescription())
        .noteType(note.getNoteType())
        .tags(tagsFor(note.getId()))
        .isPinned(note.isPinned())
        .isFavorite(note.isFavorite())
        .isArchived(note.isArchived())
        .createdAt(note.getCreatedAt())
        .updatedAt(note.getUpdatedAt())
        .build();
  }

  private NoteResponse toFull(Note note) {
    String plainText = note.getContentPlainText() == null ? "" : note.getContentPlainText();
    int wordCount = NoteContentUtil.wordCount(plainText);

    List<NoteLink> outgoingLinks = noteLinkRepository.findAllBySourceNoteId(note.getId());
    List<NoteLink> incomingLinks = noteLinkRepository.findAllByTargetNoteId(note.getId());

    // One batch fetch for every note on either end of a link, instead of a
    // findById per link - a note with N links used to cost N queries here,
    // each loading a whole row (content included) just for a title+excerpt.
    List<UUID> linkedNoteIds =
        Stream.concat(
                outgoingLinks.stream().map(NoteLink::getTargetNoteId),
                incomingLinks.stream().map(NoteLink::getSourceNoteId))
            .distinct()
            .toList();

    Map<UUID, Note> linkedNotes =
        linkedNoteIds.isEmpty()
            ? Map.of()
            : noteRepository.findAllById(linkedNoteIds).stream()
                .collect(Collectors.toMap(Note::getId, linked -> linked));

    List<NoteLinkResponse> outgoing =
        outgoingLinks.stream()
            .map(link -> toLinkResponse(linkedNotes.get(link.getTargetNoteId()), link.getCreatedAt()))
            .filter(java.util.Objects::nonNull)
            .toList();

    List<NoteLinkResponse> backlinks =
        incomingLinks.stream()
            .map(link -> toLinkResponse(linkedNotes.get(link.getSourceNoteId()), link.getCreatedAt()))
            .filter(java.util.Objects::nonNull)
            .toList();

    List<NoteModuleLinkResponse> moduleLinks =
        noteModuleLinkRepository.findAllByNoteId(note.getId()).stream()
            .map(
                l ->
                    NoteModuleLinkResponse.builder()
                        .id(l.getId())
                        .moduleType(l.getModuleType())
                        .moduleId(l.getModuleId())
                        .createdAt(l.getCreatedAt())
                        .build())
            .toList();

    // Capped at the 20 most recent versions rather than the whole history -
    // GET /v1/notes/{id}/versions still serves the exhaustive list.
    List<NoteVersionResponse> versions =
        noteVersionRepository.findTop20ByNoteIdOrderByVersionNumberDesc(note.getId()).stream()
            .map(
                v ->
                    NoteVersionResponse.builder()
                        .id(v.getId())
                        .versionNumber(v.getVersionNumber())
                        .createdAt(v.getCreatedAt())
                        .createdBy(v.getCreatedBy())
                        .build())
            .toList();

    return NoteResponse.builder()
        .id(note.getId())
        .title(note.getTitle())
        .content(note.getContent())
        .description(note.getDescription())
        .noteType(note.getNoteType())
        .parentNoteId(note.getParentNoteId())
        .isPinned(note.isPinned())
        .isArchived(note.isArchived())
        .isFavorite(note.isFavorite())
        .contentVersion(note.getContentVersion())
        .wordCount(wordCount)
        .readingTimeMinutes(NoteContentUtil.readingTimeMinutes(wordCount))
        .tags(tagsFor(note.getId()))
        .folderIds(noteFolderService.getFolderIdsForNote(note.getId()))
        .attachments(
            noteAttachmentRepository.findAllByNoteIdAndDeletedAtIsNull(note.getId()).stream()
                .map(
                    a ->
                        com.lifeos.notes.domains.dto.response.AttachmentResponse.builder()
                            .id(a.getId())
                            .fileName(a.getFileName())
                            .fileSize(a.getFileSize())
                            .fileType(a.getFileType())
                            .uploadDate(a.getUploadDate())
                            .build())
                .toList())
        .outgoingLinks(outgoing)
        .backlinks(backlinks)
        .moduleLinks(moduleLinks)
        .versions(versions)
        .followUpAt(note.getFollowUpAt())
        .createdAt(note.getCreatedAt())
        .updatedAt(note.getUpdatedAt())
        .build();
  }

  // `other` comes from toFull's batch-loaded map and is null when the note on
  // the far end of the link no longer exists; callers filter those out, which
  // preserves the previous per-link findById().orElse(null) behaviour.
  private NoteLinkResponse toLinkResponse(Note other, Instant linkedAt) {
    if (other == null) {
      return null;
    }

    return NoteLinkResponse.builder()
        .id(other.getId())
        .title(other.getTitle())
        .excerpt(NoteContentUtil.excerpt(other.getContentPlainText(), 160))
        .linkedAt(linkedAt)
        .build();
  }

  private List<TagResponse> tagsFor(UUID noteId) {
    List<UUID> tagIds = noteTagRepository.findAllByNoteId(noteId).stream().map(NoteTag::getTagId).toList();

    if (tagIds.isEmpty()) {
      return List.of();
    }

    Map<UUID, Long> usage =
        tagRepository.countUsageForTags(tagIds).stream()
            .collect(
                Collectors.toMap(
                    TagRepository.TagUsage::getTagId, TagRepository.TagUsage::getUsageCount));

    return tagRepository.findAllById(tagIds).stream()
        .map(
            (Tag tag) ->
                TagResponse.builder()
                    .id(tag.getId())
                    .name(tag.getName())
                    .color(tag.getColor())
                    .usageCount(usage.getOrDefault(tag.getId(), 0L))
                    .createdAt(tag.getCreatedAt())
                    .build())
        .toList();
  }
}
