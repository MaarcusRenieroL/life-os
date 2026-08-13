package com.lifeos.core.domains.dto.request;

import com.lifeos.core.domains.enums.NoteModuleType;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.experimental.FieldDefaults;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateNoteModuleLinkRequest {

  @NotNull NoteModuleType moduleType;

  @NotNull UUID moduleId;
}
