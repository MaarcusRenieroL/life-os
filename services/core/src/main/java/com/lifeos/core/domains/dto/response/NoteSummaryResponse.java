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
public class NoteSummaryResponse {

  UUID id;

  String title;

  String description;

  NoteType noteType;

  @Builder.Default List<TagResponse> tags = List.of();

  @JsonProperty("isPinned")
  boolean isPinned;

  @JsonProperty("isFavorite")
  boolean isFavorite;

  @JsonProperty("isArchived")
  boolean isArchived;

  Instant createdAt;

  Instant updatedAt;
}
