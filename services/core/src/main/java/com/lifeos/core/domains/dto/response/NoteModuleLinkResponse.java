package com.lifeos.core.domains.dto.response;

import com.lifeos.core.domains.enums.NoteModuleType;
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
public class NoteModuleLinkResponse {

  UUID id;

  NoteModuleType moduleType;

  UUID moduleId;

  Instant createdAt;
}
