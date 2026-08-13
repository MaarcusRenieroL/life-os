package com.lifeos.core.domains.dto.request;

import com.lifeos.core.domains.enums.NoteType;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateNoteRequest {

  @Size(max = 500)
  String title;

  String content;

  @Size(max = 1000)
  String description;

  NoteType noteType;

  Boolean isPinned;

  Boolean isArchived;

  Boolean isFavorite;
}
