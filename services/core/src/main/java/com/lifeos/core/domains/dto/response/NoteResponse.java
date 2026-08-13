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
import lombok.Getter;
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

  // @Data's default getter for a `boolean isPinned` field is isPinned(),
  // which Jackson's bean-property naming strips the "is" from - serializing
  // as "pinned" instead of "isPinned" and silently breaking frontend code
  // that reads response.isPinned. @Getter(NONE) here plus the hand-written,
  // @JsonProperty-annotated getter below is what actually forces the name;
  // annotating the field alone creates a second, differently-named property
  // instead of renaming the existing one.
  @Getter(AccessLevel.NONE)
  boolean isPinned;

  @Getter(AccessLevel.NONE)
  boolean isArchived;

  @Getter(AccessLevel.NONE)
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

  @JsonProperty("isPinned")
  public boolean isPinned() {
    return isPinned;
  }

  @JsonProperty("isArchived")
  public boolean isArchived() {
    return isArchived;
  }

  @JsonProperty("isFavorite")
  public boolean isFavorite() {
    return isFavorite;
  }
}
