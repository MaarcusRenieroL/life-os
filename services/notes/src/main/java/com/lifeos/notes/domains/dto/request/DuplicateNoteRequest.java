package com.lifeos.notes.domains.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DuplicateNoteRequest {

  @Size(max = 500)
  String newTitle;
}
