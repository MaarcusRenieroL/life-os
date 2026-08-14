package com.lifeos.notes.domains.dto.response;

import java.time.Instant;
import java.util.List;
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
public class FolderResponse {

  UUID id;

  String name;

  UUID parentFolderId;

  long noteCount;

  Instant createdAt;

  Instant updatedAt;

  @Builder.Default List<FolderResponse> children = List.of();
}
