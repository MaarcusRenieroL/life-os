package com.lifeos.core.domains.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lifeos.core.domains.enums.NoteType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NoteResponse {

  UUID id;

  String title;

  String content;

  String description;

  NoteType noteType;

  UUID parentNoteId;

  @JsonProperty("isPinned")
  boolean isPinned;

  @JsonProperty("isArchived")
  boolean isArchived;

  @JsonProperty("isFavorite")
  boolean isFavorite;

  int contentVersion;

  int wordCount;

  int readingTimeMinutes;

  @Builder.Default List<TagResponse> tags = List.of();

  @Builder.Default List<UUID> folderIds = List.of();

  @Builder.Default List<AttachmentResponse> attachments = List.of();

  @Builder.Default List<NoteLinkResponse> outgoingLinks = List.of();

  @Builder.Default List<NoteLinkResponse> backlinks = List.of();

  @Builder.Default List<NoteModuleLinkResponse> moduleLinks = List.of();

  @Builder.Default List<NoteVersionResponse> versions = List.of();

  Instant createdAt;

  Instant updatedAt;
}
