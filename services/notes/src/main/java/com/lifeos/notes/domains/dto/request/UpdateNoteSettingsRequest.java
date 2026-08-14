package com.lifeos.notes.domains.dto.request;

import com.lifeos.notes.domains.enums.NoteType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateNoteSettingsRequest {

  NoteType defaultNoteType;

  Boolean autoArchiveEnabled;

  @Min(1)
  @Max(3650)
  Integer autoArchiveDays;
}
