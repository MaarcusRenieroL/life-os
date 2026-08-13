package com.lifeos.core.domains.dto.response;

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
public class SearchResultResponse {

  UUID id;

  String title;

  String excerpt;

  @Builder.Default List<TagResponse> tags = List.of();

  @Builder.Default List<String> matchedFields = List.of();

  Instant updatedAt;
}
