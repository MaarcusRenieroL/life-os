package com.lifeos.notes.domains.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lifeos.notes.domains.enums.NoteType;
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
public class NoteSummaryResponse {

  UUID id;

  String title;

  String description;

  NoteType noteType;

  @Builder.Default List<TagResponse> tags = List.of();

  // See NoteResponse for why these need an explicit @JsonProperty-annotated
  // getter rather than a field-level annotation - Lombok's default getter
  // name for a `boolean isXxx` field otherwise wins the Jackson naming and
  // serializes as "xxx", not "isXxx".
  @Getter(AccessLevel.NONE)
  boolean isPinned;

  @Getter(AccessLevel.NONE)
  boolean isFavorite;

  @Getter(AccessLevel.NONE)
  boolean isArchived;

  Instant createdAt;

  Instant updatedAt;

  @JsonProperty("isPinned")
  public boolean isPinned() {
    return isPinned;
  }

  @JsonProperty("isFavorite")
  public boolean isFavorite() {
    return isFavorite;
  }

  @JsonProperty("isArchived")
  public boolean isArchived() {
    return isArchived;
  }
}
