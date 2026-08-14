package com.lifeos.core.domains.dto.response;

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
public class GraphNodeResponse {

  UUID id;

  String title;

  String noteType;

  UUID folderId;

  String folderName;

  int connectionCount;
}
