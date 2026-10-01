package com.lifeos.notes.domains.dto.request;

import com.lifeos.notes.domains.enums.NoteType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
