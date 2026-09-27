package com.lifeos.notes.domains.dto.request;

import com.lifeos.notes.domains.enums.NoteType;
import jakarta.validation.constraints.Size;
import java.time.Instant;
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

  // Optional follow-up reminder date/time. Absent (null) in the request body means "leave
  // unchanged" - to clear an existing follow-up, callers use clearFollowUpAt below, since a
  // missing JSON field and an explicit clear are otherwise indistinguishable on a plain Instant.
  Instant followUpAt;

  Boolean clearFollowUpAt;
}
