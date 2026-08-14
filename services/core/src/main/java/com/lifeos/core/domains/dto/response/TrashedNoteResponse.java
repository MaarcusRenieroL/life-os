package com.lifeos.core.domains.dto.response;

import java.time.Instant;
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
public class TrashedNoteResponse {

  UUID id;

  String title;

  Instant deletedAt;

  // The retention sweep runs daily off deletedAt + 30 days - surfacing that
  // computed date directly means the frontend doesn't reimplement the same
  // arithmetic (and can't drift from it if the retention window changes).
  Instant purgesAt;
}
