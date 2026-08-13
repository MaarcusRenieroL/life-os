package com.lifeos.core.domains.dto.request;

import com.lifeos.core.domains.enums.NoteType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateNoteRequest {

  @NotBlank
  @Size(max = 500)
  String title;

  String content;

  NoteType noteType;

  UUID folderId;

  List<String> tags;

  List<CreateNoteModuleLinkRequest> moduleLinks;
}
