package com.lifeos.notes.domains.dto.response;

import com.lifeos.notes.domains.enums.NoteType;
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
public class NoteSettingsResponse {

  NoteType defaultNoteType;

  // Field name doesn't start with "is", so Lombok's isAutoArchiveEnabled()
  // getter and Jackson's derived property name ("autoArchiveEnabled") agree
  // without needing the @JsonProperty workaround NoteResponse's isPinned/
  // isArchived/isFavorite fields require.
  boolean autoArchiveEnabled;

  int autoArchiveDays;
}
