package com.lifeos.vault.domains.dto.response;

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
public class VaultCategorySnapshotResponse {

  UUID id;

  String name;

  String color;

  Instant createdAt;

  Instant updatedAt;
}
