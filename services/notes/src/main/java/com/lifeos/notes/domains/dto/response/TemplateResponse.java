package com.lifeos.notes.domains.dto.response;

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
public class TemplateResponse {

  UUID id;

  String name;

  String content;

  String category;

  String preview;

  Instant createdAt;

  Instant updatedAt;
}
